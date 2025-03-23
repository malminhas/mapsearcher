variable "frontend_port" {
  description = "Port to expose the frontend service"
  type        = number
  default     = 8010
}

variable "backend_port" {
  description = "Port to expose the backend service"
  type        = number
  default     = 8000
}

variable "docker_network_name" {
  description = "Name of the Docker network"
  type        = string
  default     = "mapsearcher_network"
}

variable "mapbox_token" {
  description = "Mapbox API token"
  type        = string
  default     = ""
}

variable "cache_size" {
  description = "Number of entries to keep in the API cache"
  type        = number
  default     = 1000
}

variable "cache_ttl" {
  description = "Time to live for cache entries in seconds"
  type        = number
  default     = 3600
}

variable "log_level" {
  description = "Logging level for the backend service"
  type        = string
  default     = "DEBUG"
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "http://localhost:8010"  # Default to our frontend port
} 