provider "google" {
  project = var.project_id
  region  = var.region
}

provider "github" {
  token = var.github_token
}

# APIs

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# Artifact Registry

resource "google_artifact_registry_repository" "api" {
  depends_on    = [google_project_service.apis]
  location      = var.region
  repository_id = "djtunez-api"
  format        = "DOCKER"
  description   = "Docker images for the DJTunez API"
}

# Service Accounts

# Runs the Cloud Run container
resource "google_service_account" "cloud_run" {
  account_id   = "djtunez-api-runner"
  display_name = "DJTunez API - Cloud Run runtime SA"
}

# Used by GitHub Actions to deploy
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deployer"
  display_name = "DJTunez API - GitHub Actions deployer SA"
}

# Workload Identity Federation (keyless GitHub Actions auth)

resource "google_iam_workload_identity_pool" "github" {
  depends_on                = [google_project_service.apis]
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC provider"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  # Restrict to your repo so no other GitHub repo can impersonate this SA
  attribute_condition = "assertion.repository == '${var.github_repo}'"
}

# Allow the GitHub Actions WIF identity to impersonate the deployer SA
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

#  IAM - GitHub Actions deployer 

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/run.admin",                    # deploy Cloud Run services
    "roles/artifactregistry.writer",      # push Docker images
    "roles/iam.serviceAccountUser",       # act-as the Cloud Run runtime SA
    "roles/secretmanager.secretAccessor", # read secrets (for terraform plan)
    "roles/storage.objectAdmin",          # read/write Terraform state bucket
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

#  IAM - Cloud Run runtime SA 

resource "google_project_iam_member" "cloud_run_roles" {
  for_each = toset([
    "roles/artifactregistry.reader",      # pull its own image
    "roles/firebase.viewer",              # read Firebase config
    "roles/firebaseauth.admin",           # Firebase Auth
    "roles/datastore.user",               # Firestore read/write
    "roles/storage.objectAdmin",          # Firebase Storage
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

#  Secret Manager 

locals {
  secret_ids = [
    "stripe_secret_key",
    "stripe_webhook_secret",
    "spotify_client_id",
    "spotify_client_secret",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  depends_on = [google_project_service.apis]
  for_each   = toset(local.secret_ids)
  secret_id  = each.value

  replication {
    auto {}
  }
}

# Let the Cloud Run SA read all secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each  = google_secret_manager_secret.secrets
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Secret versions — values come from tfvars (sensitive)
resource "google_secret_manager_secret_version" "secret_versions" {
  for_each = {
    stripe_secret_key     = var.stripe_secret_key
    stripe_webhook_secret = var.stripe_webhook_secret
    spotify_client_id     = var.spotify_client_id
    spotify_client_secret = var.spotify_client_secret
  }

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}

#  Cloud Run 

resource "google_cloud_run_v2_service" "api" {
  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.api,
    google_secret_manager_secret_iam_member.cloud_run_access,
  ]

  name     = "djtunez-api"
  location = var.region

  deletion_protection = false

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # Only allocate CPU during request processing (cost-efficient)
        cpu_idle = true
      }

      #  Plain env vars 
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "8080"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "PLATFORM_FEE_PERCENT"
        value = var.platform_fee_percent
      }
      env {
        name  = "PROD_FRONTEND_HOSTNAME"
        value = var.prod_frontend_hostname
      }
      # Omitted on first apply (Cloud Run URL unknown). After first apply:
      #   1. terraform output cloud_run_url
      #   2. Add expo_public_stripe_api_url = "<url>" to terraform.tfvars
      #   3. terraform apply
      dynamic "env" {
        for_each = var.expo_public_stripe_api_url != null ? [var.expo_public_stripe_api_url] : []
        content {
          name  = "EXPO_PUBLIC_STRIPE_API_URL"
          value = env.value
        }
      }

      #  Secrets from Secret Manager
      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["stripe_secret_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["stripe_webhook_secret"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SPOTIFY_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["spotify_client_id"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SPOTIFY_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["spotify_client_secret"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_TYPE_LATEST"
    percent = 100
  }
}

# Allow unauthenticated (public) access
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# GitHub Actions secrets — automatically populated after WIF resources are created
locals {
  # Split "owner/repo" -> "repo"
  github_repo_name = split("/", var.github_repo)[1]
}

resource "github_actions_secret" "wif_provider" {
  repository      = local.github_repo_name
  secret_name     = "WIF_PROVIDER"
  plaintext_value = google_iam_workload_identity_pool_provider.github.name
}

resource "github_actions_secret" "wif_service_account" {
  repository      = local.github_repo_name
  secret_name     = "WIF_SERVICE_ACCOUNT"
  plaintext_value = google_service_account.github_actions.email
}
