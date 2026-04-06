import pandas as pd
import json

df = pd.read_excel('radioactive_equipment_database_v3.xlsx', sheet_name=None)
out = {}
for sheet, data in df.items():
    data = data.dropna(how='all').dropna(axis=1, how='all')
    out[sheet] = {
        'columns': list(data.columns),
        'sample': data.head(3).astype(str).to_dict(orient='records')
    }

with open('equip_db_structure.json', 'w') as f:
    json.dump(out, f, indent=2)

print("Dumped structure to equip_db_structure.json")
