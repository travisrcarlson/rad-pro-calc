import pandas as pd
import json

df_dict = pd.read_excel('radioactive_equipment_database_v3.xlsx', sheet_name=None)

# Process Master Device Database
master = df_dict.get('Master Device Database')
master = master.dropna(how='all').dropna(axis=1, how='all')
headers = master.iloc[0].astype(str).tolist()
master = master[1:].copy()
master.columns = headers

devices = []
for _, row in master.iterrows():
    if str(row.get('Device Name', '')).strip() and str(row.get('Device Name', '')) != 'nan':
        device = {k:("" if str(v)=='nan' else v) for k,v in row.to_dict().items()}
        devices.append(device)

# Process Military & Aerospace
mil = df_dict.get('Military & Aerospace')
mil = mil.dropna(how='all').dropna(axis=1, how='all')
mil_headers = mil.iloc[0].astype(str).tolist()
mil = mil[1:].copy()
mil.columns = mil_headers

for _, row in mil.iterrows():
    if str(row.get('Device / Platform', '')).strip() and str(row.get('Device / Platform', '')) != 'nan':
        device = {k:("" if str(v)=='nan' else v) for k,v in row.to_dict().items()}
        # Normalize keys to match master where possible
        device['Device Name'] = device.get('Device / Platform')
        device['Sector / Application'] = 'Military & Aerospace'
        device['Primary Isotope(s)'] = device.get('Isotope')
        device['Manufacturer / Owner'] = device.get('Service / Operator')
        devices.append(device)
        
with open('src/data/equipment_database.json', 'w', encoding='utf-8') as f:
    json.dump(devices, f, indent=2)

print(f"Extracted {len(devices)} devices into src/data/equipment_database.json")
