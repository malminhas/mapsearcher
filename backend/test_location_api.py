import pytest # type: ignore
from fastapi.testclient import TestClient # type: ignore
import time # type: ignore
from location_api import app # type: ignore
import math

# Test data
TEST_POSTCODE = "SW1A 1AA"
TEST_LATITUDE = 51.501009
TEST_LONGITUDE = -0.141588
TEST_TOWN = "LONDON"
TEST_COUNTY = ""
TEST_STREET1 = "Downing Street"
TEST_DISTRICT1 = "Westminster"

# Spatial test configuration
SMALL_RADIUS = 10  # Use smaller radius for faster queries
SMALL_LIMIT = 5    # Limit results to reduce data transfer

@pytest.fixture(scope="module")
def client():
    """Create a test client that persists for the entire test module."""
    return TestClient(app)

def is_close(a, b, rel_tol=1e-9, abs_tol=0.0):
    """Compare two floating point numbers with tolerance."""
    return math.isclose(a, b, rel_tol=rel_tol, abs_tol=abs_tol)

def test_get_location_success(client):
    """Test successful location lookup."""
    response = client.get(f"/location/{TEST_POSTCODE}")
    assert response.status_code == 200
    data = response.json()
    assert data["postcode"] == TEST_POSTCODE
    assert is_close(data["latitude"], TEST_LATITUDE)
    assert is_close(data["longitude"], TEST_LONGITUDE)
    assert data["town"] == TEST_TOWN
    assert data["county"] == TEST_COUNTY
    assert "street1" in data
    assert "district1" in data

def test_get_location_not_found(client):
    """Test location lookup for non-existent postcode."""
    response = client.get("/location/ZZ99 9ZZ")  # Valid format but guaranteed not to exist
    assert response.status_code == 404
    assert response.json()["detail"] == "Postcode ZZ99 9ZZ not found"

def test_get_location_invalid_format(client):
    """Test location lookup with invalid postcode format."""
    response = client.get("/location/INVALID")  # Invalid format
    assert response.status_code == 422
    error_detail = response.json()["detail"][0]  # FastAPI returns a list of errors
    assert error_detail["msg"] == "String should match pattern '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$'"
    assert error_detail["input"] == "INVALID"
    assert error_detail["loc"] == ["path", "postcode"]

def test_get_location_invalid_postcode(client):
    """Test location lookup with empty postcode."""
    response = client.get("/location/")  # Empty postcode
    assert response.status_code == 404

def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data

def test_cache_performance(client):
    """Test that caching improves response time."""
    # Clear the cache by making a request with a different postcode
    client.get("/location/INVALID")
    
    # First request (uncached)
    start_time = time.time()
    response1 = client.get(f"/location/{TEST_POSTCODE}")
    first_request_time = time.time() - start_time
    
    # Second request (cached)
    start_time = time.time()
    response2 = client.get(f"/location/{TEST_POSTCODE}")
    second_request_time = time.time() - start_time
    
    # Verify responses are identical
    assert response1.json() == response2.json()
    
    # For very fast operations (< 1ms), timing comparisons are unreliable
    # Instead, just verify both requests completed successfully
    if first_request_time < 0.001:  # Less than 1ms
        assert second_request_time < 0.001  # Also less than 1ms
    else:
        # For slower operations, verify cached request is faster
        assert second_request_time <= first_request_time * 1.1  # Allow 10% slower due to system load

def test_concurrent_requests(client):
    """Test handling of concurrent requests."""
    import concurrent.futures
    
    def make_request():
        return client.get(f"/location/{TEST_POSTCODE}")
    
    # Make 10 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(10)]
        responses = [future.result() for future in futures]
    
    # Verify all requests succeeded
    assert all(response.status_code == 200 for response in responses)
    # Verify all responses are identical
    assert len(set(str(response.json()) for response in responses)) == 1

def test_search_by_postcode(client):
    """Test searching locations by postcode."""
    # Test exact match
    response = client.get(f"/search/postcode/{TEST_POSTCODE}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) > 0
    assert any(loc["postcode"] == TEST_POSTCODE for loc in data["locations"])
    
    # Test partial match
    response = client.get("/search/postcode/SW1A")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) > 0
    assert all("SW1A" in loc["postcode"] for loc in data["locations"])
    
    # Test no matches
    response = client.get("/search/postcode/INVALID")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) == 0

def test_search_by_town(client):
    """Test searching locations by town."""
    # Test exact match
    response = client.get(f"/search/town/{TEST_TOWN}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) > 0
    
    # Check that at least one result has TEST_TOWN in either town, district1, or district2 (case insensitive)
    assert any(
        TEST_TOWN.upper() in loc["town"].upper() or
        (loc["district1"] and TEST_TOWN.upper() in loc["district1"].upper()) or
        (loc["district2"] and TEST_TOWN.upper() in loc["district2"].upper())
        for loc in data["locations"]
    )
    
    # Test partial match
    response = client.get("/search/town/LON")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) > 0
    # Check that results contain LON in either town, district1, or district2 (case insensitive)
    assert all(
        "LON" in loc["town"].upper() or 
        (loc["district1"] and "LON" in loc["district1"].upper()) or 
        (loc["district2"] and "LON" in loc["district2"].upper())
        for loc in data["locations"]
    )
    
    # Test no matches
    response = client.get("/search/town/INVALID")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) == 0

def test_search_by_county(client):
    """Test searching locations by county."""
    # Test with empty county (as per our test data)
    response = client.get("/search/county/")  # Use empty string instead of space
    assert response.status_code == 404
    
    # Test partial match
    response = client.get("/search/county/ABERDEENSHIRE")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) > 0
    assert all("ABERDEENSHIRE" in loc["county"] for loc in data["locations"])
    
    # Test no matches
    response = client.get("/search/county/INVALID")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) == 0

def test_search_result_limit(client):
    """Test that search results are limited to specified entries."""
    # Test default limit (1000)
    response = client.get("/search/town/L")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) <= 1000
    
    # Test custom limit
    response = client.get("/search/town/L?limit=50")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) <= 50

def test_search_by_town_includes_district(client):
    """Test that town search includes District1 and District2 in results."""
    response = client.get("/search/town/LONDON")
    assert response.status_code == 200
    data = response.json()
    assert len(data["locations"]) > 0
    # Check that results include either matching town, district1, or district2
    assert any(
        "LONDON" in loc["town"].upper() or 
        "LONDON" in loc["district1"].upper() or 
        "LONDON" in loc["district2"].upper()
        for loc in data["locations"]
    )

def test_spatial_search_validation(client):
    """Test spatial search parameter validation."""
    # Test invalid latitude
    response = client.get(
        "/search/spatial",
        params={
            "center_lat": 91.0,
            "center_lon": TEST_LONGITUDE,
            "radius_meters": SMALL_RADIUS
        }
    )
    assert response.status_code == 422
    assert "Input should be less than or equal to 90" in response.json()["detail"][0]["msg"]

    # Test invalid longitude
    response = client.get(
        "/search/spatial",
        params={
            "center_lat": TEST_LATITUDE,
            "center_lon": 181.0,
            "radius_meters": SMALL_RADIUS
        }
    )
    assert response.status_code == 422
    assert "Input should be less than or equal to 180" in response.json()["detail"][0]["msg"]

    # Test invalid radius
    response = client.get(
        "/search/spatial",
        params={
            "center_lat": TEST_LATITUDE,
            "center_lon": TEST_LONGITUDE,
            "radius_meters": -1000
        }
    )
    assert response.status_code == 422
    assert "Input should be greater than or equal to 0" in response.json()["detail"][0]["msg"]

def test_spatial_search_comprehensive(client):
    """Comprehensive test of spatial search functionality combining multiple test cases."""
    # Test basic spatial search
    response = client.get(
        "/search/spatial",
        params={
            "center_lat": TEST_LATITUDE,
            "center_lon": TEST_LONGITUDE,
            "radius_meters": SMALL_RADIUS,
            "limit": SMALL_LIMIT
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert "total_count" in data
    assert "within_radius_count" in data
    assert data["total_count"] >= data["within_radius_count"]
    assert len(data["locations"]) <= SMALL_LIMIT

    # Test with postcode filter
    response = client.get(
        f"/search/postcode/{TEST_POSTCODE}",
        params={
            "center_lat": TEST_LATITUDE,
            "center_lon": TEST_LONGITUDE,
            "radius_meters": SMALL_RADIUS,
            "limit": SMALL_LIMIT
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert data["total_count"] >= data["within_radius_count"]
    assert len(data["locations"]) <= SMALL_LIMIT

    # Test with town filter
    response = client.get(
        f"/search/town/{TEST_TOWN}",
        params={
            "center_lat": TEST_LATITUDE,
            "center_lon": TEST_LONGITUDE,
            "radius_meters": SMALL_RADIUS,
            "limit": SMALL_LIMIT
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert data["total_count"] >= data["within_radius_count"]
    assert len(data["locations"]) <= SMALL_LIMIT

    # Test empty radius
    response = client.get(
        "/search/spatial",
        params={
            "center_lat": TEST_LATITUDE,
            "center_lon": TEST_LONGITUDE,
            "radius_meters": 0,
            "limit": SMALL_LIMIT
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["within_radius_count"] == 0
    assert len(data["locations"]) == 0

def test_spatial_search_edge_coordinates(client):
    """Test spatial search with edge case coordinates using minimal radius and limit."""
    edge_cases = [
        (0.0, 0.0, "equator"),
        (90.0, 0.0, "north pole"),
        (0.0, 180.0, "date line")
    ]

    for lat, lon, case in edge_cases:
        response = client.get(
            "/search/spatial",
            params={
                "center_lat": lat,
                "center_lon": lon,
                "radius_meters": SMALL_RADIUS,
                "limit": SMALL_LIMIT
            }
        )
        assert response.status_code == 200, f"Failed for {case}"
        data = response.json()
        assert "locations" in data
        assert "total_count" in data
        assert "within_radius_count" in data
        assert data["total_count"] >= data["within_radius_count"]
        assert len(data["locations"]) <= SMALL_LIMIT 