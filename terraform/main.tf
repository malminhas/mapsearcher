terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

locals {
  env_content = file("${path.root}/../.env")
  
  # Frontend variables
  mapbox_token = var.mapbox_token != "" ? var.mapbox_token : (
    can(regex("VITE_MAPBOX_TOKEN=([^\n]+)", local.env_content)) ? 
    regex("VITE_MAPBOX_TOKEN=([^\n]+)", local.env_content)[0] : 
    ""
  )

  # Backend variables
  cache_size = var.cache_size != 1000 ? var.cache_size : (
    can(regex("CACHE_SIZE=([^\n]+)", local.env_content)) ?
    tonumber(regex("CACHE_SIZE=([^\n]+)", local.env_content)[0]) :
    1000
  )

  cache_ttl = var.cache_ttl != 3600 ? var.cache_ttl : (
    can(regex("CACHE_TTL=([^\n]+)", local.env_content)) ?
    tonumber(regex("CACHE_TTL=([^\n]+)", local.env_content)[0]) :
    3600
  )

  log_level = var.log_level != "DEBUG" ? var.log_level : (
    can(regex("LOG_LEVEL=([^\n]+)", local.env_content)) ?
    regex("LOG_LEVEL=([^\n]+)", local.env_content)[0] :
    "DEBUG"
  )

  allowed_origins = var.allowed_origins != "http://localhost:8010" ? var.allowed_origins : (
    can(regex("ALLOWED_ORIGINS=([^\n]+)", local.env_content)) ?
    regex("ALLOWED_ORIGINS=([^\n]+)", local.env_content)[0] :
    "http://localhost:8010"
  )

  # Convert relative path to absolute path for Docker volume
  workspace_dir = abspath(path.root)
  project_root = dirname(local.workspace_dir)
  db_path = "${local.project_root}/backend/data/locations.db"
}

# Validate Mapbox token exists
resource "null_resource" "validate_mapbox_token" {
  provisioner "local-exec" {
    command = <<-EOT
      if [ -z "${local.mapbox_token}" ]; then
        echo "Error: Mapbox token not found in .env file or provided as a variable"
        exit 1
      fi
    EOT
  }
}

# Check for database file existence
resource "null_resource" "database_check" {
  provisioner "local-exec" {
    command = <<-EOT
      if [ ! -f "${local.db_path}" ]; then
        echo "Error: Database file not found at ${local.db_path}"
        echo "Please run 'python csv_to_sqlite.py --create locations.csv' in the backend directory first"
        exit 1
      fi
    EOT
  }
}

# Create a Docker network
resource "docker_network" "mapsearcher_network" {
  name = var.docker_network_name
}

# Build and run the backend container
resource "docker_image" "backend" {
  name = "mapsearcher-backend:latest"
  build {
    context = "${path.root}/../backend"
    tag     = ["mapsearcher-backend:latest"]
  }
  triggers = {
    dir_sha1 = sha1(join("", [for f in fileset(path.root, "../backend/*") : filesha1(f)]))
  }

  depends_on = [null_resource.database_check]
}

resource "docker_container" "backend" {
  name  = "mapsearcher-backend"
  image = docker_image.backend.image_id
  
  ports {
    internal = var.backend_port
    external = var.backend_port
  }

  networks_advanced {
    name = docker_network.mapsearcher_network.name
  }

  volumes {
    host_path      = "${local.db_path}"
    container_path = "/app/data/locations.db"
    read_only      = false
  }

  env = [
    "CACHE_SIZE=${local.cache_size}",
    "CACHE_TTL=${local.cache_ttl}",
    "LOG_LEVEL=${local.log_level}",
    "ALLOWED_ORIGINS=${local.allowed_origins}"
  ]

  depends_on = [docker_image.backend, null_resource.database_check]
}

# Build and run the frontend container
resource "docker_image" "frontend" {
  name = "mapsearcher-frontend:latest"
  build {
    context = "${path.root}/.."
    tag     = ["mapsearcher-frontend:latest"]
  }
  triggers = {
    dir_sha1 = sha1(join("", [for f in fileset(path.root, "../src/*") : filesha1(f)]))
  }
}

resource "docker_container" "frontend" {
  name  = "mapsearcher-frontend"
  image = docker_image.frontend.image_id
  
  ports {
    internal = var.frontend_port
    external = var.frontend_port
  }

  networks_advanced {
    name = docker_network.mapsearcher_network.name
  }

  env = [
    "VITE_API_URL=http://localhost:${var.backend_port}",
    "VITE_MAPBOX_TOKEN=${local.mapbox_token}"
  ]

  depends_on = [docker_container.backend, null_resource.validate_mapbox_token]
} 