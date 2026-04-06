import pandas as pd
import os
import json

filepath = os.path.join(os.environ['TEMP'], 'Radiation_Safety_Core_Documents.xlsx')
xl = pd.ExcelFile(filepath)
sheets = xl.sheet_names

out = {}
for sheet in sheets:
    df = xl.parse(sheet)
    df = df.fillna(value='')
    df = df.astype(str)
    out[sheet] = {
        'columns': df.columns.tolist(),
        'first_rows': df.head(5).to_dict(orient='records')
    }

with open(os.path.join(os.environ['TEMP'], 'data.json'), 'w') as f:
    json.dump(out, f, indent=2)

print("Done")
