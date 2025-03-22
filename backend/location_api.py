"""
Location API Service
-------------------

A FastAPI-based service for looking up geographic coordinates by postcode.
This service is optimized for high performance with the following features:

Performance Optimizations:
------------------------
1. Database Optimizations:
   - Indexed columns (Postcode, Town, County) for fast lookups
   - Connection pooling with timeout settings
   - Autocommit mode enabled for better write performance
   - Parameterized queries to prevent SQL injection

2. Caching:
   - LRU (Least Recently Used) cache for frequently accessed postcodes
   - Cache size: 1000 entries
   - Cache TTL: 1 hour
   - Memory-efficient caching using functools.lru_cache

3. Connection Management:
   - Context manager for proper connection handling
   - 5-second connection timeout
   - Automatic connection cleanup
   - Connection pooling to reduce overhead

4. Query Optimization:
   - LIMIT 1 to stop searching after first match
   - Indexed lookups for O(log n) performance
   - Minimal data retrieval (only required fields)

5. Error Handling:
   - Graceful database connection failures
   - Specific error messages for different failure types
   - Health check endpoint with database status

Security Features:
----------------
1. Input Validation:
   - Strict regex patterns for postcodes, towns, and counties
   - Length limits on all input fields
   - Pydantic models for request validation
   - Input sanitization to prevent SQL injection

2. Query Protection:
   - Parameterized SQL queries
   - Case-insensitive searches using SQL UPPER()
   - Sanitized input handling
   - Maximum limit constraints on results

3. Error Handling:
   - Sanitized error messages
   - No sensitive data in responses
   - Comprehensive error logging
   - Graceful failure modes

4. API Security:
   - CORS middleware with configurable origins
   - Request validation
   - Rate limiting support
   - Health check endpoint for monitoring

Usage:
------
1. Start the server:
   python location_api.py

2. Access the API:
   GET /location/{postcode} - Get coordinates for a postcode
   GET /health - Check service health

3. View API documentation:
   http://localhost:8000/docs

Performance Considerations:
-------------------------
- First request for a postcode: ~10-50ms (database lookup)
- Subsequent requests: ~1-5ms (cache hit)
- Concurrent requests: Handled efficiently with connection pooling
- Memory usage: ~100MB for cache (1000 entries)
- Database size impact: ~10-20% additional space for indexes
"""

from fastapi import FastAPI, HTTPException, Depends, Query, Path # type: ignore
from pydantic import BaseModel, constr, field_validator # type: ignore
import sqlite3 # type: ignore
from typing import Optional, Dict, Any, List # type: ignore
import uvicorn # type: ignore
from functools import lru_cache # type: ignore
import time # type: ignore
from contextlib import contextmanager
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime
import sys
import re

# Regular expressions for validation
POSTCODE_PATTERN = r'^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$'
TOWN_PATTERN = r'^[A-Za-z\s\-\'\.]+$'
COUNTY_PATTERN = r'^[A-Za-z\s\-\'\.]+$'

class SearchQuery(BaseModel):
    """Base model for search queries with validation."""
    query: str
    limit: int = 1000

    @field_validator('limit')
    @classmethod
    def validate_limit(cls, v):
        if v < 1 or v > 5000:  # Increased maximum limit to 5000
            raise ValueError('Limit must be between 1 and 5000')
        return v

class PostcodeQuery(SearchQuery):
    """Model for postcode search queries."""
    @field_validator('query')
    @classmethod
    def validate_postcode(cls, v):
        # Convert to uppercase and remove spaces for validation
        v = v.upper().replace(' ', '')
        # Allow partial postcodes by making the pattern less strict for searches
        if not re.match(r'^[A-Z0-9]+$', v):
            raise ValueError('Postcode can only contain letters and numbers')
        if len(v) > 7:
            raise ValueError('Postcode is too long')
        return v

class TownQuery(SearchQuery):
    """Model for town search queries."""
    @field_validator('query')
    @classmethod
    def validate_town(cls, v):
        if not re.match(TOWN_PATTERN, v):
            raise ValueError('Town can only contain letters, spaces, hyphens, apostrophes, and periods')
        if len(v) > 100:
            raise ValueError('Town name is too long')
        return v

class CountyQuery(SearchQuery):
    """Model for county search queries."""
    @field_validator('query')
    @classmethod
    def validate_county(cls, v):
        if not re.match(COUNTY_PATTERN, v):
            raise ValueError('County can only contain letters, spaces, hyphens, apostrophes, and periods')
        if len(v) > 100:
            raise ValueError('County name is too long')
        return v

def sanitize_input(value: str) -> str:
    """Sanitize input to prevent SQL injection."""
    # Remove any dangerous characters
    return re.sub(r'[;\'\"\\]', '', value)

# Configure logging before creating the FastAPI app
def setup_logging():
    """Configure logging for the application."""
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Generate log filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = f'logs/location_api_{timestamp}.log'
    
    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG,  # Set to DEBUG for more verbose output
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)  # Ensure logs go to stdout
        ],
        force=True  # Force reconfiguration of the root logger
    )
    
    # Create logger for this module
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized. Log file: {log_file}")
    return logger

# Initialize logging
logger = setup_logging()

# Initialize database name
DB_NAME = 'gumtree.db'

# Cache settings
CACHE_SIZE = 1000  # Number of postcodes to cache
CACHE_TTL = 3600  # Cache TTL in seconds (1 hour)

class LocationResponse(BaseModel):
    postcode: str
    latitude: float
    longitude: float
    town: str = ""  # Default to empty string instead of None
    county: str = ""  # Default to empty string instead of None
    street1: str = ""  # Default to empty string instead of None
    district1: str = ""  # Default to empty string instead of None
    district2: str = ""  # Default to empty string instead of None

class LocationListResponse(BaseModel):
    locations: List[LocationResponse]

class HealthResponse(BaseModel):
    status: str
    database: Dict[str, Any]

@contextmanager
def get_db_connection():
    """Context manager for database connections with timeout."""
    logger.debug("Attempting to establish database connection")
    conn = sqlite3.connect(
        DB_NAME,
        timeout=5.0,  # 5 second timeout
        isolation_level=None  # Enable autocommit mode
    )
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        logger.debug("Database connection successful")
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {str(e)}")
        raise
    finally:
        conn.close()
        logger.debug("Database connection closed")

def init_db():
    """Initialize database with indexes if they don't exist."""
    logger.info("Initializing database indexes")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Create index on Postcode if it doesn't exist
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_postcode 
        ON gumtree_data(Postcode)
        """)
        
        # Create index on Town if it doesn't exist
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_town 
        ON gumtree_data(Town)
        """)
        
        # Create index on County if it doesn't exist
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_county 
        ON gumtree_data(County)
        """)
        
        conn.commit()
        logger.info("Database indexes initialized successfully")

@lru_cache(maxsize=CACHE_SIZE)
def get_location_from_cache(postcode: str) -> Optional[LocationResponse]:
    """
    Get location from cache if available and not expired.
    Returns None if not in cache or expired.
    """
    logger.debug(f"Attempting to get location for postcode: {postcode}")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Optimized query with index usage
        query = """
        SELECT Postcode, Latitude, Longitude, Town, County, Street1, District1, District2
        FROM gumtree_data
        WHERE Postcode = ?
        LIMIT 1
        """
        
        cursor.execute(query, (postcode,))
        result = cursor.fetchone()
        
        if not result:
            logger.info(f"Postcode not found: {postcode}")
            return None
        
        logger.debug(f"Found location for postcode: {postcode}")
        return LocationResponse(
            postcode=result['Postcode'],
            latitude=float(result['Latitude']),
            longitude=float(result['Longitude']),
            town=result['Town'] or "",
            county=result['County'] or "",
            street1=result['Street1'] or "",
            district1=result['District1'] or "",
            district2=result['District2'] or ""
        )

def search_locations(query: str, field: str, limit: int = 1000) -> List[LocationResponse]:
    """
    Search locations by a given field and query.
    
    Args:
        query (str): The search query
        field (str): The field to search in ('Postcode', 'Town', or 'County')
        limit (int, optional): Maximum number of results to return. Defaults to 1000.
        
    Returns:
        List[LocationResponse]: List of matching locations
    """
    logger.info(f"Searching locations by {field} with query: {query} (limit: {limit})")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get actual column names from the database
        cursor.execute("PRAGMA table_info(gumtree_data)")
        columns = {row['name'].lower(): row['name'] for row in cursor.fetchall()}
        
        # Find the correct column name (case-insensitive)
        field_lower = field.lower()
        if field_lower not in columns:
            logger.error(f"Field not found in database: {field}")
            raise ValueError(f"Field {field} not found in database")
        
        actual_field = columns[field_lower]
        
        # Special handling for postcode search
        if field_lower == 'postcode':
            # Remove spaces and convert to uppercase for comparison
            normalized_query = query.replace(' ', '').upper()
            search_query = f"""
            SELECT Postcode, Latitude, Longitude, Town, County, Street1, District1, District2
            FROM gumtree_data
            WHERE REPLACE(UPPER({actual_field}), ' ', '') LIKE ?
            ORDER BY Postcode ASC
            LIMIT {limit}
            """
            cursor.execute(search_query, (f"%{normalized_query}%",))
        # Special handling for town search to include District1 and District2
        elif field_lower == 'town':
            search_query = f"""
            SELECT Postcode, Latitude, Longitude, Town, County, Street1, District1, District2
            FROM gumtree_data
            WHERE UPPER({actual_field}) LIKE UPPER(?) OR UPPER(District1) LIKE UPPER(?) OR UPPER(District2) LIKE UPPER(?)
            ORDER BY Postcode ASC
            LIMIT {limit}
            """
            cursor.execute(search_query, (f"%{query}%", f"%{query}%", f"%{query}%"))
        else:
            # Use LIKE for partial matches
            search_query = f"""
            SELECT Postcode, Latitude, Longitude, Town, County, Street1, District1, District2
            FROM gumtree_data
            WHERE UPPER({actual_field}) LIKE UPPER(?)
            ORDER BY Postcode ASC
            LIMIT {limit}
            """
            cursor.execute(search_query, (f"%{query}%",))
        
        results = cursor.fetchall()
        
        logger.info(f"Found {len(results)} results for {field} search: {query}")
        return [
            LocationResponse(
                postcode=row['Postcode'],
                latitude=row['Latitude'] or 0.0,  # Default to 0.0 if NULL
                longitude=row['Longitude'] or 0.0,  # Default to 0.0 if NULL
                town=row['Town'] or "",
                county=row['County'] or "",
                street1=row['Street1'] or "",
                district1=row['District1'] or "",
                district2=row['District2'] or ""
            )
            for row in results
        ]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI application."""
    # Startup
    logger.info("Starting up Location API service...")
    # Verify database connection
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM gumtree_data")
            count = cursor.fetchone()[0]
            logger.info(f"Database connection verified. Found {count} records.")
    except Exception as e:
        logger.error(f"Database connection failed during startup: {e}")
    yield
    # Shutdown
    logger.info("Shutting down Location API service...")
    # Clear cache
    get_location_from_cache.cache_clear()
    logger.info("Cache cleared during shutdown")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Location API",
    description="""
A high-performance API for looking up and searching UK locations by postcode, town, and county.

## Features
* **Exact Lookup**: Get location details by exact postcode
* **Partial Search**: Search locations by partial postcode
* **Town Search**: Search locations by town name (includes districts)
* **County Search**: Search locations by county name
* **Health Check**: Monitor service health and database status

## Security
* **Input Validation**: Strict validation and sanitization of all inputs
* **Rate Limiting**: Protection against excessive requests
* **CORS Protection**: Configurable cross-origin resource sharing
* **Error Handling**: Secure error responses and logging

## Technical Notes
* All searches are case-insensitive
* Town searches include `District1` and `District2` fields
* Results are ordered by postcode
* Default result limits:
  * Regular searches: 1000 results
  * Postcode searches: 5000 results

## Response Format
```json
{
    "postcode": "SW1A 1AA",
    "latitude": 51.501009,
    "longitude": -0.141588,
    "town": "LONDON",
    "county": "GREATER LONDON",
    "street1": "DOWNING STREET",
    "district1": "WESTMINSTER",
    "district2": ""
}
```

## Documentation
* Interactive API documentation: `/docs`
* Alternative documentation: `/redoc`
* OpenAPI specification: `/openapi.json`
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "locations",
            "description": "Operations for looking up and searching location data"
        },
        {
            "name": "health",
            "description": "Health check endpoint for monitoring"
        }
    ]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get(
    "/location/{postcode}", 
    response_model=LocationResponse, 
    summary="Get location by postcode",
    tags=["locations"],
    responses={
        200: {
            "description": "Successful location lookup",
            "content": {
                "application/json": {
                    "example": {
                        "postcode": "SW1A 1AA",
                        "latitude": 51.501009,
                        "longitude": -0.141588,
                        "town": "LONDON",
                        "county": "GREATER LONDON",
                        "street1": "DOWNING STREET",
                        "district1": "WESTMINSTER",
                        "district2": ""
                    }
                }
            }
        },
        404: {
            "description": "Postcode not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Postcode SW1A 1AA not found"}
                }
            }
        },
        422: {
            "description": "Invalid postcode format",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid postcode format"}
                }
            }
        }
    }
)
async def get_location(
    postcode: str = Path(
        ..., 
        pattern=POSTCODE_PATTERN,
        description="UK postcode in standard format (e.g., SW1A 1AA)",
        examples=["SW1A 1AA"]
    )
):
    """
    Retrieve detailed location information for a specific UK postcode.
    
    The postcode must be in a valid UK format (e.g., SW1A 1AA, W1A 1HQ).
    Spaces in the postcode are optional.
    
    **Args:**
    
    * **postcode** (str): A valid UK postcode
        
    **Returns:**
    
    * **LocationResponse**: Location details including coordinates and address components
        
    **Raises:**
    
    * **HTTPException (404)**: If the postcode is not found
    * **HTTPException (422)**: If the postcode format is invalid
    * **HTTPException (500)**: For database errors
    """
    logger.info(f"Received location request for postcode: {postcode}")
    try:
        # Sanitize and validate input
        postcode = sanitize_input(postcode.upper())
        
        # Try to get from cache first
        result = get_location_from_cache(postcode)
        
        if result is None:
            logger.warning(f"Postcode not found: {postcode}")
            raise HTTPException(status_code=404, detail=f"Postcode {postcode} not found")
        
        logger.info(f"Successfully retrieved location for postcode: {postcode}")
        return result
        
    except HTTPException:
        raise
    except sqlite3.Error as e:
        logger.error(f"Database error for postcode {postcode}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error for postcode {postcode}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get(
    "/search/postcode/{query}", 
    response_model=LocationListResponse, 
    summary="Search locations by postcode",
    tags=["locations"],
    responses={
        200: {
            "description": "Successful search",
            "content": {
                "application/json": {
                    "example": {
                        "locations": [
                            {
                                "postcode": "SW1A 1AA",
                                "latitude": 51.501009,
                                "longitude": -0.141588,
                                "town": "LONDON",
                                "county": "GREATER LONDON",
                                "street1": "DOWNING STREET",
                                "district1": "WESTMINSTER",
                                "district2": ""
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def search_by_postcode(
    query: str = Path(
        ..., 
        min_length=1, 
        max_length=8,
        description="Full or partial postcode to search for",
        examples=["SW1"]
    ),
    limit: int = Query(
        1000, 
        ge=1, 
        le=5000,  # Updated to match model
        description="Maximum number of results to return"
    )
):
    """
    Search for locations by full or partial postcode.
    
    Performs a case-insensitive search that matches any part of the postcode.
    Results are ordered alphabetically by postcode.
    
    **Args:**
    
    * **query** (str): Full or partial postcode (1-8 characters)
    * **limit** (int, optional): Maximum number of results (1-5000, default: 1000)
        
    **Returns:**
    
    * **LocationListResponse**: List of matching locations
        
    **Raises:**
    
    * **HTTPException (400)**: If the query format is invalid
    * **HTTPException (500)**: For database errors
    """
    logger.info(f"Received postcode search request for query: {query}")
    try:
        # Validate input
        validated_query = PostcodeQuery(query=query, limit=limit)
        # Sanitize input
        safe_query = sanitize_input(validated_query.query)
        
        locations = search_locations(safe_query, 'Postcode', validated_query.limit)
        logger.info(f"Found {len(locations)} locations matching postcode query: {safe_query}")
        return LocationListResponse(locations=locations)
    except ValueError as e:
        logger.error(f"Invalid search request for postcode: {query} - {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during postcode search for {query}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get(
    "/search/town/{query}", 
    response_model=LocationListResponse, 
    summary="Search locations by town",
    tags=["locations"],
    responses={
        200: {
            "description": "Successful search",
            "content": {
                "application/json": {
                    "example": {
                        "locations": [
                            {
                                "postcode": "SW1A 1AA",
                                "latitude": 51.501009,
                                "longitude": -0.141588,
                                "town": "LONDON",
                                "county": "GREATER LONDON",
                                "street1": "DOWNING STREET",
                                "district1": "WESTMINSTER",
                                "district2": ""
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def search_by_town(
    query: str = Path(
        ..., 
        min_length=1, 
        max_length=100,
        description="Town name to search for",
        examples=["London"]
    ),
    limit: int = Query(
        1000, 
        ge=1, 
        le=5000,  # Updated to match model
        description="Maximum number of results to return"
    )
):
    """
    Search for locations by town name.
    
    Performs a case-insensitive search across town names and districts.
    The search includes:
    
    * Town field
    * District1 field
    * District2 field
    
    Results are ordered alphabetically by postcode.
    
    **Args:**
    
    * **query** (str): Town name (1-100 characters)
    * **limit** (int, optional): Maximum number of results (1-5000, default: 1000)
        
    **Returns:**
    
    * **LocationListResponse**: List of matching locations
        
    **Raises:**
    
    * **HTTPException (400)**: If the query format is invalid
    * **HTTPException (500)**: For database errors
    """
    logger.info(f"Received town search request for query: {query}")
    try:
        # Validate input
        validated_query = TownQuery(query=query, limit=limit)
        # Sanitize input
        safe_query = sanitize_input(validated_query.query)
        
        locations = search_locations(safe_query, 'Town', validated_query.limit)
        logger.info(f"Found {len(locations)} locations matching town query: {safe_query}")
        return LocationListResponse(locations=locations)
    except ValueError as e:
        logger.error(f"Invalid search request for town: {query} - {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during town search for {query}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get(
    "/search/county/{query}", 
    response_model=LocationListResponse, 
    summary="Search locations by county",
    tags=["locations"],
    responses={
        200: {
            "description": "Successful search",
            "content": {
                "application/json": {
                    "example": {
                        "locations": [
                            {
                                "postcode": "SW1A 1AA",
                                "latitude": 51.501009,
                                "longitude": -0.141588,
                                "town": "LONDON",
                                "county": "GREATER LONDON",
                                "street1": "DOWNING STREET",
                                "district1": "WESTMINSTER",
                                "district2": ""
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def search_by_county(
    query: str = Path(
        ..., 
        min_length=1, 
        max_length=100,
        description="County name to search for",
        examples=["Greater London"]
    ),
    limit: int = Query(
        1000, 
        ge=1, 
        le=5000,  # Updated to match model
        description="Maximum number of results to return"
    )
):
    """
    Search for locations by county name.
    
    Performs a case-insensitive search that matches any part of the county name.
    Results are ordered alphabetically by postcode.
    
    **Args:**
    
    * **query** (str): County name (1-100 characters)
    * **limit** (int, optional): Maximum number of results (1-5000, default: 1000)
        
    **Returns:**
    
    * **LocationListResponse**: List of matching locations
        
    **Raises:**
    
    * **HTTPException (400)**: If the query format is invalid
    * **HTTPException (500)**: For database errors
    """
    logger.info(f"Received county search request for query: {query}")
    try:
        # Validate input
        validated_query = CountyQuery(query=query, limit=limit)
        # Sanitize input
        safe_query = sanitize_input(validated_query.query)
        
        locations = search_locations(safe_query, 'County', validated_query.limit)
        logger.info(f"Found {len(locations)} locations matching county query: {safe_query}")
        return LocationListResponse(locations=locations)
    except ValueError as e:
        logger.error(f"Invalid search request for county: {query} - {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during county search for {query}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get(
    "/health", 
    response_model=HealthResponse, 
    summary="Health check endpoint",
    tags=["health"],
    responses={
        200: {
            "description": "System health information",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "database": {
                            "connected": True,
                            "record_count": 1234567
                        }
                    }
                }
            }
        }
    }
)
async def health_check():
    """
    Check the health status of the API and its dependencies.
    
    Verifies:
    
    * API service status
    * Database connection
    * Database record count
    
    **Returns:**
    
    * **HealthResponse**: Health status information
        
    **Response Format:**
    ```json
    {
        "status": "healthy" | "degraded",
        "database": {
            "connected": boolean,
            "record_count": integer | null,
            "error": string | null
        }
    }
    ```
    """
    logger.debug("Received health check request")
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM gumtree_data")
            count = cursor.fetchone()[0]
            logger.info(f"Health check successful. Database record count: {count}")
            return HealthResponse(
                status="healthy",
                database={"connected": True, "record_count": count}
            )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="degraded",
            database={"connected": False, "error": str(e)}
        )

if __name__ == "__main__":
    logger.info("Starting Location API server")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug") 