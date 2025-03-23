output "frontend_url" {
  description = "URL to access the frontend"
  value       = "http://localhost:${var.frontend_port}"
}

output "backend_url" {
  description = "URL to access the backend API"
  value       = "http://localhost:${var.backend_port}"
}

output "swagger_url" {
  description = "URL to access the Swagger documentation"
  value       = "http://localhost:${var.backend_port}/docs"
} 