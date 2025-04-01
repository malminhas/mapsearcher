# Mapsearcher

A modern web application for exploring UK postcodes, districts and towns with spatial search capabilities.
Built with Cursor and Lovable.  Uses React, TypeScript, shadcn/ui, Mapbox GL JS and Tailwind CSS at the frontend. 
FastAPI and SQLite with Spatialite extension at the backend.

## Features

- **Spatial Search**: Search locations within a specified radius of any point
- **Multi-mode Search**: Search by postcode, town, or county
- **Interactive Map**: Visual representation of search results with Mapbox integration
- **Geofencing**: Display and filter results within a specified radius
- **Mock Data Support**: Fallback to mock data when backend is unavailable
- **Modern UI**: Built with React, TypeScript, and shadcn/ui

Type a location string to return a set of related postcode rows.  Select a row to throw an adjustable geofence around that postcode:

<img width="1257" alt="image" src="https://github.com/user-attachments/assets/6690d70e-06fb-4f54-acff-119ccc35f808" />

## Architecture

### Frontend (TypeScript + React)

- **UI Components**: Built with shadcn/ui and Tailwind CSS
- **Map Integration**: Uses Mapbox GL JS for interactive mapping
- **State Management**: React hooks and context for local state
- **API Layer**: Typed API client with error handling and mock data support
- **Routing**: React Router for navigation
- **Styling**: Tailwind CSS with dark mode support

### Backend (Python + FastAPI)

- **API Framework**: FastAPI with automatic OpenAPI documentation
- **Database**: SQLite with SpatiaLite extension for spatial queries
- **Performance Optimizations**:
  - LRU caching with configurable size and TTL
  - Connection pooling
  - Indexed spatial queries
  - Parameterized SQL for security
- **Security Features**:
  - CORS protection
  - Input validation
  - Rate limiting support
  - Secure error handling

### Spatial Features

The application uses SpatiaLite for efficient spatial queries:

1. **Spatial Indexing**:
   - R*Tree spatial index on latitude/longitude columns
   - Optimized for range and radius queries
   - Supports efficient geofencing operations

2. **Distance Calculations**:
   - Uses geodesic distance calculations
   - Supports radius-based searches
   - Results sorted by distance from center point

3. **Geofencing**:
   - Dynamic radius adjustment (100m to 50km)
   - Visual representation on map
   - Real-time filtering of results

## API Endpoints

### Location Search

- `GET /search/postcode/{postcode}`
  - Search by full or partial postcode
  - Supports spatial parameters

- `GET /search/town/{town}`
  - Search by town name
  - Includes district matching
  - Supports spatial parameters

- `GET /search/county/{county}`
  - Search by county name
  - Supports spatial parameters

### Spatial Search

- `GET /search/spatial`
  - Search locations within radius
  - Parameters:
    - `center_lat`: Center latitude (-90 to 90)
    - `center_lon`: Center longitude (-180 to 180)
    - `radius_meters`: Search radius (0 to 50000)
    - `limit`: Maximum results (1-5000)

All search endpoints support the following query parameters:
- `limit`: Maximum number of results to return
- `center_lat`: Center latitude for spatial search
- `center_lon`: Center longitude for spatial search
- `radius_meters`: Search radius in meters

## Project Setup

### Prerequisites

- Node.js & npm
- Python 3.11+
- SQLite with SpatiaLite extension
- UK Postcode Address File (PAF) data

### Backend Setup

1. Install system dependencies:

**macOS**:
```bash
# Install SpatiaLite and its dependencies
$ brew update
$ brew install spatialite-tools
```

2. Create a Python virtual environment and install dependencies:
```bash
# Create and activate virtual environment
$ python -m venv venv
$ source venv/bin/activate

# Install Python dependencies
$ cd backend
$ pip install -r requirements.txt
$ pip install pandas matplotlib seaborn python-multipart docopt
```

3. Create the database in /backend/data:
```bash
$ python csv_to_sqlite.py -c locations.csv
```

4. Start the backend:
```bash
$ python -m uvicorn location_api:app --reload
```

The API documentation will be available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

<img width="1372" alt="image" src="https://github.com/user-attachments/assets/2fa7044b-e6eb-4583-8137-60daf084ce67" />

### Frontend Setup

1. Install dependencies:
```bash
$ npm install
```

2. Create a `.env` file with your Mapbox token:
```
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

3. Start the development server:
```bash
$ npm run dev
```

## Docker Deployment

The project includes Docker and Terraform configurations for containerized deployment:

```bash
$ cd terraform
$ terraform init
$ terraform apply
```

This will:
1. Build and run the backend container
2. Build and run the frontend container
3. Create a Docker network for communication
4. Mount the database volume
5. Configure environment variables

## Security

- All inputs are validated and sanitized
- SQL injection protection through parameterized queries
- CORS protection with configurable origins
- Rate limiting support
- Secure error handling and logging
- Content Security Policy headers
- XSS protection headers

## Performance

The application is optimized for performance:

- Frontend:
  - Code splitting and lazy loading
  - Optimized asset delivery
  - Efficient state management
  - Debounced search inputs

- Backend:
  - LRU caching (configurable size and TTL)
  - Connection pooling
  - Indexed queries
  - Optimized spatial calculations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
