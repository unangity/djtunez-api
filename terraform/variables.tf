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

variable "custom_domain" {
  description = "Custom domain for the Cloud Run service (e.g. api.reqrave.com). Domain must be verified in Google Search Console first."
  type        = string
}

variable "prod_frontend_hostname" {
  description = "Hostname of the frontend app allowed through CORS (e.g. app.yourdomain.com)"
  type        = string
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

variable "smtp_password" {
  description = "SMTP account password used to send contact form emails"
  type        = string
  sensitive   = true
}

# Plain Cloud Run env vars for email

variable "smtp_user" {
  description = "SMTP sender email address (e.g. noreply@reqrave.com)"
  type        = string
}

variable "smtp_host" {
  description = "SMTP server hostname (e.g. smtp.gmail.com)"
  type        = string
}

variable "smtp_port" {
  description = "SMTP server port"
  type        = string
  default     = "587"
}

variable "contact_recipient" {
  description = "Email address that receives contact form submissions"
  type        = string
}
