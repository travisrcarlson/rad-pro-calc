import pandas as pd
import os
import json
import math

filepath = os.path.join(os.environ['TEMP'], 'Radiation_Safety_Core_Documents.xlsx')
xl = pd.ExcelFile(filepath)

def clean_data(df):
    df = df.fillna(value='')
    df.columns = [str(c) for c in df.columns]
    
    # Standardize column names from the 3rd row (which has headers usually)
    # The first two rows in Radionuclide Data are mostly title/empty.
    # Let's inspect the first 4 rows to find the headers row.
    return df

# Extract Radionuclide Data
df_nuc = clean_data(xl.parse('Radionuclide Data'))
# In our previous inspection, the header is at index 2 (row 3 in excel).
headers = df_nuc.iloc[2].tolist()
df_nuc = df_nuc[3:].copy()
df_nuc.columns = headers

records_nuc = []
for _, row in df_nuc.iterrows():
    if row['Nuclide'] and str(row['Nuclide']).strip() != '':
        # Filter out random junk
        if str(row['Nuclide']).startswith('Source') or str(row['Nuclide']) == 'Nuclide':
            continue
            
        record = {}
        for col in headers:
            if col and str(col).strip():
                val = row[col]
                # Try converting to float if it looks like a number
                try:
                    vf = float(val)
                    if math.isnan(vf):
                        val = ""
                    else:
                        val = vf
                except:
                    pass
                record[str(col).strip()] = val
        records_nuc.append(record)

with open(r'c:\Users\travi\OneDrive\Documents\Antigravity projects\Rad Pro Calc\nuclides.json', 'w', encoding='utf-8') as f:
    json.dump(records_nuc, f, indent=2)

# Extract Decay Chains
df_dec = clean_data(xl.parse('Decay Chains'))
# Header is at index 3
headers_dec = df_dec.iloc[3].tolist()
df_dec = df_dec[4:].copy()
df_dec.columns = headers_dec

records_dec = []
current_chain = ""
for _, row in df_dec.iterrows():
    chain_val = str(row.get('Chain / Series', '')).strip()
    if chain_val and not str(row.get('Nuclide', '')).strip():
         current_chain = chain_val
         continue
    
    nuc = str(row.get('Nuclide', '')).strip()
    if nuc:
        record = {'Chain': current_chain}
        for col in headers_dec:
            if col and str(col).strip() and col != 'Chain / Series':
                val = row[col]
                record[str(col).strip()] = val
        records_dec.append(record)

with open(r'c:\Users\travi\OneDrive\Documents\Antigravity projects\Rad Pro Calc\decay_chains.json', 'w', encoding='utf-8') as f:
    json.dump(records_dec, f, indent=2)

print("Data extracted.")
