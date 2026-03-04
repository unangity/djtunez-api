variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "djtunez"
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "europe-west1"
}

variable "image" {
  description = "Full Docker image URL to deploy (e.g. europe-west1-docker.pkg.dev/djtunez/djtunez-api/api:sha)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in 'owner/repo' format — used to scope Workload Identity and populate secrets"
  type        = string
}

variable "github_token" {
  description = "GitHub personal access token with 'repo' scope — used to write Actions secrets"
  type        = string
  sensitive   = true
}

# Plain Cloud Run env vars

variable "platform_fee_percent" {
  description = "Percentage fee the platform keeps on every charge"
  type        = string
  default     = "10"
}

variable "prod_frontend_hostname" {
  description = "Hostname of the frontend app allowed through CORS (e.g. app.yourdomain.com)"
  type        = string
}

variable "stripe_return_url" {
  description = "URL Stripe redirects to after onboarding (e.g. https://yourdomain.com/stripe/return)"
  type        = string
}

variable "stripe_refresh_url" {
  description = "URL Stripe redirects to when the onboarding link expires (e.g. https://yourdomain.com/stripe/refresh)"
  type        = string
}

variable "expo_public_stripe_api_url" {
  description = "Cloud Run service URL exposed to the Expo client. Leave unset on first apply — get the value from `terraform output cloud_run_url` then re-apply."
  type        = string
  default     = null
  nullable    = true
}

# Secret Manager secret values 

variable "stripe_secret_key" {
  description = "Stripe secret key (sk_live_... or sk_test_...)"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret (whsec_...)"
  type        = string
  sensitive   = true
}

variable "spotify_client_id" {
  description = "Spotify app client ID"
  type        = string
  sensitive   = true
}

variable "spotify_client_secret" {
  description = "Spotify app client secret"
  type        = string
  sensitive   = true
}
