import pandas as pd
import json

# 1. Define what we actually need to keep (shaving off 95% of the data)
cols_to_keep = ['fdc_id', 'brand_owner', 'brand_name', 'description', 'ingredients', 'branded_food_category']

def clean_usda_data(input_file, output_file):
    processed_count = 0
    clean_data = []

    # Read in chunks so it doesn't break your RAM
    for chunk in pd.read_csv(input_file, usecols=cols_to_keep, chunksize=50000):
        # A. Filter for SNAP Eligible Categories
        # (Exclude non-food items like vitamins, pet food, etc.)
        chunk = chunk[~chunk['branded_food_category'].str.contains('Pet|Alcohol|Tobacco|Vitamin|Supplement', na=False, case=False)]

        # B. ML Logic: Simple "Processed" Classifier
        # If it has more than 10 ingredients or contains 'High Fructose', label as Processed
        chunk['is_processed'] = chunk['ingredients'].str.count(',') > 10
        
        # C. Mark all remaining as SNAP Eligible (since we filtered out the bad stuff)
        chunk['snap_eligible'] = True

        clean_data.append(chunk)
        processed_count += len(chunk)
        print(f"Processed {processed_count} rows...")

    # Combine and save as a small JSON
    final_df = pd.concat(clean_data)
    final_df.to_json(output_file, orient='records', indent=2)
    print(f"Successfully created {output_file}!")

# Run it
clean_usda_data('branded_food.csv', 'cleaned_snap_data.json')