#!/usr/bin/env python3
"""
Convert CSV file to SQLite database.

Usage:
    csv_to_sqlite.py [options] [<csv_file>]

Options:
    -c, --create       Create new database (delete existing)
    -d, --dump         Show basic database information
    --dump-detail      Show detailed database information
    -v, --verbose      Enable verbose logging
    -V, --version      Show version information
    -h, --help         Show this help message
    -g GROUP, --graph GROUP  Generate bar graph for GROUP (e.g., town, county)
    -n N, --num-entries N  Number of top entries to show in graph [default: 30]

Arguments:
    csv_file           Path to the CSV file [default: locations.csv]
"""

"""
Example SQL query to get the top 10 towns by count:

SELECT town, COUNT(*) as count
FROM location_data
GROUP BY town
ORDER BY count DESC
LIMIT 10;
"""

import pandas as pd # type: ignore
import sqlite3 # type: ignore
from pathlib import Path # type: ignore
import os # type: ignore
import sys # type: ignore
from docopt import docopt # type: ignore
import logging # type: ignore
import matplotlib.pyplot as plt # type: ignore
import seaborn as sns # type: ignore
import subprocess # type: ignore

__version__ = '1.0.1'
__date__ = '23-03-2025'
__author__ = 'Mal Minhas <mal@malm.co.uk>'

def rename_columns(df):
    """
    Rename columns in the DataFrame according to the specified mapping.
    
    Args:
        df (pd.DataFrame): Input DataFrame
    
    Returns:
        pd.DataFrame: DataFrame with renamed columns
    """
    column_mapping = {
        'EXTRA_Decimal degrees latitude': 'Latitude',
        'EXTRA_Decimal degrees longitude': 'Longitude'
    }
    return df.rename(columns=column_mapping)

def get_file_size(file_path):
    """Get file size in human readable format."""
    size = os.path.getsize(file_path)
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} TB"

def count_csv_rows(csv_file):
    """Count rows in CSV file efficiently."""
    with open(csv_file, 'r') as f:
        return sum(1 for _ in f) - 1  # Subtract header row

def get_database_info(db_name, csv_file=None):
    """
    Get information about the SQLite database.
    
    Args:
        db_name (str): Path to the SQLite database
        csv_file (str, optional): Path to the CSV file for cross-checking
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # Get table information
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    info = {
        'database_size': get_file_size(db_name),
        'tables': {}
    }
    
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        row_count = cursor.fetchone()[0]
        
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        info['tables'][table_name] = {
            'row_count': row_count,
            'columns': []
        }
        
        # Store column name and type information
        for col in columns:
            info['tables'][table_name]['columns'].append({
                'name': col[1],
                'type': col[2],
                'notnull': col[3],
                'default': col[4],
                'pk': col[5]
            })
        
        # Check for unique postcodes
        cursor.execute(f"SELECT COUNT(DISTINCT Postcode) FROM {table_name};")
        unique_postcodes = cursor.fetchone()[0]
        info['tables'][table_name]['unique_postcodes'] = unique_postcodes
        
        # Check for unique latitude/longitude combinations
        cursor.execute("SELECT COUNT(DISTINCT LATITUDE || ',' || LONGITUDE) FROM location_data;")
        unique_locations = cursor.fetchone()[0]
        info['tables'][table_name]['unique_locations'] = unique_locations
        
        # Check for unique identifiers
        info['tables'][table_name]['unique_identifiers'] = {}
        
        # Check each column for uniqueness
        for col in columns:
            col_name = col[1]
            cursor.execute(f"SELECT COUNT(DISTINCT {col_name}) FROM {table_name};")
            unique_count = cursor.fetchone()[0]
            info['tables'][table_name]['unique_identifiers'][col_name] = unique_count
        
        # Check common combinations for uniqueness
        combinations = [
            ('Postcode', 'Title'),
            ('Postcode', 'Description'),
            ('Postcode', 'Price'),
            ('Postcode', 'County'),
            ('Postcode', 'LATITUDE', 'LONGITUDE'),
            ('Title', 'Description', 'Price'),
            ('Title', 'Description', 'County'),
            ('Title', 'Description', 'LATITUDE', 'LONGITUDE')
        ]
        
        for combo in combinations:
            if all(col in [c[1] for c in columns] for col in combo):
                # Create a concatenated string of all columns for counting distinct combinations
                concat_cols = " || '|' || ".join(f'"{col}"' for col in combo)
                cursor.execute(f"SELECT COUNT(DISTINCT {concat_cols}) FROM {table_name};")
                unique_count = cursor.fetchone()[0]
                info['tables'][table_name]['unique_identifiers'][f"Combination: {', '.join(combo)}"] = unique_count
    
    conn.close()
    
    # Add CSV row count if file is provided
    if csv_file and os.path.exists(csv_file):
        info['csv_rows'] = count_csv_rows(csv_file)
    
    return info

def get_duplicate_postcodes(db_name, limit=5):
    """
    Get examples of duplicate postcodes from the database.
    
    Args:
        db_name (str): Path to the SQLite database
        limit (int): Number of duplicate postcodes to show
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # Get the actual column names from the database
    cursor.execute("PRAGMA table_info(location_data);")
    columns = [col[1] for col in cursor.fetchall()]
    
    # Find the matching columns (case-insensitive)
    title_col = next((col for col in columns if col.lower() == 'stem'), None)  # Using Stem as title
    desc_col = next((col for col in columns if col.lower() == 'street1'), None)  # Using Street1 as description
    price_col = next((col for col in columns if col.lower() == 'commercial'), None)  # Using Commercial as price
    county_col = next((col for col in columns if col.lower() == 'county'), None)
    
    if not all([title_col, desc_col, price_col, county_col]):
        print("Error: Required columns not found in database. Available columns:")
        print(", ".join(columns))
        conn.close()
        return "Unable to show duplicate postcodes due to missing columns."
    
    # Query to get postcodes with multiple entries
    query = f"""
    WITH DuplicatePostcodes AS (
        SELECT Postcode, COUNT(*) as count
        FROM location_data
        GROUP BY Postcode
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT ?
    )
    SELECT d.Postcode, d.count, g."{title_col}", g."{desc_col}", g."{price_col}", g."{county_col}"
    FROM DuplicatePostcodes d
    JOIN location_data g ON d.Postcode = g.Postcode
    ORDER BY d.count DESC, d.Postcode, g."{title_col}"
    """
    
    cursor.execute(query, (limit,))
    results = cursor.fetchall()
    
    if not results:
        return "No duplicate postcodes found."
    
    # Format the results
    output = []
    current_postcode = None
    current_count = None
    
    for row in results:
        postcode, count, title, description, price, county = row
        
        if postcode != current_postcode:
            if current_postcode is not None:
                output.append("")  # Add blank line between postcodes
            current_postcode = postcode
            current_count = count
            output.append(f"\nPostcode: {postcode} (appears {count} times)")
        
        # Truncate long descriptions
        if description and len(description) > 100:
            description = description[:97] + "..."
        
        # Format all information in a single line
        info_parts = [
            f"Stem: {title}",
            f"Street: {description}",
            f"County: {county}"
        ]
        output.append(f"  - {', '.join(info_parts)}")
    
    conn.close()
    return "\n".join(output)

def print_basic_database_info(info):
    """Print basic database information in a formatted way."""
    print("\nDatabase Information:")
    print(f"Database Size: {info['database_size']}")
    
    # Print row count comparison if available
    if 'csv_rows' in info:
        print(f"\nRow Count Comparison:")
        print(f"  CSV file: {info['csv_rows']:,} rows")
        for table_name, table_info in info['tables'].items():
            print(f"  Database table '{table_name}': {table_info['row_count']:,} rows")
            if table_info['row_count'] != info['csv_rows']:
                print(f"  ⚠️  WARNING: Row count mismatch!")
    
    print("\nTables:")
    for table_name, table_info in info['tables'].items():
        print(f"\n{table_name}:")
        print(f"  Rows: {table_info['row_count']}")

def print_database_info(info):
    """Print database information in a formatted way."""
    print("\nDatabase Information:")
    print(f"Database Size: {info['database_size']}")
    
    # Print row count comparison if available
    if 'csv_rows' in info:
        print(f"\nRow Count Comparison:")
        print(f"  CSV file: {info['csv_rows']:,} rows")
        for table_name, table_info in info['tables'].items():
            print(f"  Database table '{table_name}': {table_info['row_count']:,} rows")
            if table_info['row_count'] != info['csv_rows']:
                print(f"  ⚠️  WARNING: Row count mismatch!")
    
    print("\nTables:")
    for table_name, table_info in info['tables'].items():
        print(f"\n{table_name}:")
        print(f"  Rows: {table_info['row_count']}")
        print(f"  Unique Postcodes: {table_info['unique_postcodes']:,}")
        if table_info['row_count'] != table_info['unique_postcodes']:
            print(f"  ⚠️  WARNING: Not all rows have unique postcodes!")
            print("\n  Examples of duplicate postcodes:")
            print(get_duplicate_postcodes('locations.db'))
        
        print(f"  Unique Locations (LATITUDE,LONGITUDE): {table_info['unique_locations']:,}")
        if table_info['row_count'] != table_info['unique_locations']:
            print(f"  ⚠️  WARNING: Not all rows have unique locations!")
        
        print("\n  Uniqueness Analysis:")
        print("  Single Column Uniqueness:")
        for col_name, unique_count in table_info['unique_identifiers'].items():
            if not col_name.startswith('Combination:'):
                print(f"    - {col_name}: {unique_count:,} unique values")
                if unique_count == table_info['row_count']:
                    print(f"      ✓ This column uniquely identifies each row")
        
        print("\n  Column Combination Uniqueness:")
        for combo_name, unique_count in table_info['unique_identifiers'].items():
            if combo_name.startswith('Combination:'):
                print(f"    - {combo_name}: {unique_count:,} unique combinations")
                if unique_count == table_info['row_count']:
                    print(f"      ✓ This combination uniquely identifies each row")
        
        print("\n  Columns:")
        for col in table_info['columns']:
            constraints = []
            if col['notnull']:
                constraints.append('NOT NULL')
            if col['pk']:
                constraints.append('PRIMARY KEY')
            if col['default'] is not None:
                constraints.append(f"DEFAULT {col['default']}")
            
            constraint_str = f" ({', '.join(constraints)})" if constraints else ""
            print(f"    - {col['name']}: {col['type']}{constraint_str}")

def convert_csv_to_sqlite(csv_file, db_name='locations.db', table_name='location_data', verbose=False):
    """
    Convert a CSV file to SQLite database using pandas.
    
    Args:
        csv_file (str): Path to the CSV file
        db_name (str): Name of the SQLite database file
        table_name (str): Name of the table in the database
        verbose (bool): Enable verbose logging
    """
    if verbose:
        logging.basicConfig(level=logging.INFO)
    
    print(f"Reading CSV file: {csv_file}")
    
    # Count total rows in CSV
    total_rows = count_csv_rows(csv_file)
    print(f"Total rows in CSV: {total_rows:,}")
    
    # Read the CSV file in chunks to handle large files
    chunk_size = 100000  # Adjust this value based on your available memory
    chunks = pd.read_csv(csv_file, chunksize=chunk_size, low_memory=False)
    
    # Create SQLite connection
    conn = sqlite3.connect(db_name)
    
    # Process each chunk and write to database
    processed_rows = 0
    for i, chunk in enumerate(chunks):
        chunk_size = len(chunk)
        processed_rows += chunk_size
        print(f"Processing chunk {i+1}: {chunk_size:,} rows (Total processed: {processed_rows:,}/{total_rows:,})")
        
        # Rename columns before writing to database
        chunk = rename_columns(chunk)
        
        # Ensure County is TEXT type and replace NaN with empty string
        if 'County' in chunk.columns:
            chunk['County'] = chunk['County'].fillna('').astype(str)
        
        # Write the chunk to the database
        chunk.to_sql(table_name, conn, if_exists='append' if i > 0 else 'replace', index=False)
        
        if verbose:
            logging.info(f"Chunk {i+1} written to database")
    
    # Close the connection
    conn.close()
    
    print(f"\nConversion complete! Database saved as: {db_name}")
    print(f"Final row count in database: {processed_rows:,}")
    if processed_rows != total_rows:
        print(f"⚠️  WARNING: Database row count ({processed_rows:,}) does not match CSV row count ({total_rows:,})")

def open_file(filepath):
    """Open a file using the system's default application."""
    if sys.platform == 'darwin':  # macOS
        subprocess.run(['open', filepath])
    elif sys.platform == 'win32':  # Windows
        os.startfile(filepath)
    else:  # Linux and others
        subprocess.run(['xdg-open', filepath])

def generate_bar_graph(db_name, group_by, num_entries=30):
    """
    Generate a bar graph for the specified group by column.
    
    Args:
        db_name (str): Path to the SQLite database
        group_by (str): Column to group by (e.g., 'town', 'county')
        num_entries (int): Number of top entries to show
    """
    conn = sqlite3.connect(db_name)
    
    # First, get the actual column name from the database
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(location_data);")
    columns = [col[1] for col in cursor.fetchall()]
    
    # Find the matching column (case-insensitive)
    matching_column = next((col for col in columns if col.lower() == group_by.lower()), None)
    
    if not matching_column:
        print(f"Error: Column '{group_by}' not found. Available columns:")
        print(", ".join(columns))
        conn.close()
        sys.exit(1)
    
    # Query to get the data using the correct column name
    query = f"""
    SELECT "{matching_column}", COUNT(*) as count
    FROM location_data
    GROUP BY "{matching_column}"
    ORDER BY count DESC
    LIMIT {num_entries}
    """
    
    # Read query results into pandas DataFrame
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Set up the plot style
    plt.style.use('default')  # Use default style instead of seaborn
    
    # Create figure and axis
    fig, ax = plt.subplots(figsize=(15, 8))
    
    # Create bar plot using the actual column name
    bars = ax.barh(df[matching_column], df['count'])
    
    # Customize the plot
    ax.set_title(f'Top {num_entries} {matching_column.capitalize()}s by Row Count', pad=20)
    ax.set_xlabel('Number of Rows')
    ax.set_ylabel(matching_column.capitalize())
    
    # Add value labels on the bars
    for bar in bars:
        width = bar.get_width()
        ax.text(width, bar.get_y() + bar.get_height()/2, 
                f'{int(width):,}', 
                ha='left', va='center', fontsize=8)
    
    # Adjust layout to prevent label cutoff
    plt.tight_layout()
    
    # Save the plot
    output_file = f'{matching_column.lower()}_distribution.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"\nGraph saved as: {output_file}")
    print("\nTop entries:")
    print(df.to_string(index=False))
    
    # Open the generated graph
    print(f"\nOpening graph...")
    open_file(output_file)

def get_basic_database_info(db_name, csv_file=None):
    """
    Get basic information about the SQLite database.
    
    Args:
        db_name (str): Path to the SQLite database
        csv_file (str, optional): Path to the CSV file for cross-checking
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # Get table information
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    info = {
        'database_size': get_file_size(db_name),
        'tables': {}
    }
    
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        row_count = cursor.fetchone()[0]
        
        info['tables'][table_name] = {
            'row_count': row_count
        }
    
    conn.close()
    
    # Add CSV row count if file is provided
    if csv_file and os.path.exists(csv_file):
        info['csv_rows'] = count_csv_rows(csv_file)
    
    return info

def main():
    args = docopt(__doc__, version=f"{__version__} {__date__} {__author__}")
    
    # Set up logging
    logging.basicConfig(level=logging.DEBUG if args['--verbose'] else logging.INFO)
    
    # Get the CSV file path
    csv_file = args['<csv_file>'] or "locations.csv"
    csv_path = Path(csv_file)
    
    if not csv_path.exists():
        print(f"Error: {csv_file} not found!")
        sys.exit(1)
    
    db_name = 'locations.db'
    
    # Handle create flag
    if args['--create'] and os.path.exists(db_name):
        print(f"Removing existing database: {db_name}")
        os.remove(db_name)
    
    # Handle graph flag
    if args['--graph']:
        if not os.path.exists(db_name):
            print(f"Error: Database {db_name} does not exist!")
            sys.exit(1)
        
        group_by = args['--graph'].lower()
        num_entries = int(args['--num-entries'])
        
        try:
            generate_bar_graph(db_name, group_by, num_entries)
        except sqlite3.OperationalError as e:
            print(f"Error: Invalid column name '{group_by}'. Available columns:")
            conn = sqlite3.connect(db_name)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(location_data);")
            columns = [col[1] for col in cursor.fetchall()]
            conn.close()
            print(", ".join(columns))
            sys.exit(1)
        sys.exit(0)
    
    # Handle dump flags
    if args['--dump-detail']:
        if not os.path.exists(db_name):
            print(f"Error: Database {db_name} does not exist!")
            sys.exit(1)
        info = get_database_info(db_name, str(csv_path))
        print_database_info(info)
        sys.exit(0)
    elif args['--dump']:
        if not os.path.exists(db_name):
            print(f"Error: Database {db_name} does not exist!")
            sys.exit(1)
        info = get_basic_database_info(db_name, str(csv_path))
        print_basic_database_info(info)
        sys.exit(0)
    
    # Convert CSV to SQLite
    convert_csv_to_sqlite(str(csv_path), db_name, verbose=args['--verbose'])

if __name__ == "__main__":
    main() 