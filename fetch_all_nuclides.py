import urllib.request
import csv
import json
import io

print("Fetching IAEA NNDC data...")
req = urllib.request.Request('https://www-nds.iaea.org/relnsd/v0/data?fields=ground_states&nuclides=all', headers={'User-Agent': 'Mozilla/5.0'})
response = urllib.request.urlopen(req)
csv_data = response.read().decode('utf-8')

reader = csv.DictReader(io.StringIO(csv_data))
nuclides = []

# Fields we care about: z, n, symbol, radius, half_life, half_life_sec, decay_1, decay_1_%
for row in reader:
    try:
        z = int(row['z'])
        n = int(row['n'])
        symbol = row['symbol']
        halflife_raw = row.get('half_life', '')
        unit_hl = row.get('unit_hl', '')
        halflife = f"{halflife_raw} {unit_hl}".strip() if halflife_raw else ''
        halflife_sec = row.get('half_life_sec', '')
        decay = row.get('decay_1', '')
        decay_perc = row.get('decay_1_%', '')
        
        # Format the label
        nuclide_label = f"{symbol}-{z+n}"
        
        nuclides.append({
            'Z': z,
            'N': n,
            'Symbol': symbol,
            'Nuclide': nuclide_label,
            'Half-Life': halflife,
            'Half-Life (s)': halflife_sec,
            'Decay Mode': decay,
            'Decay %': decay_perc,
            'Decay 2': row.get('decay_2', ''),
            'Decay 2 %': row.get('decay_2_%', ''),
            'Decay 3': row.get('decay_3', ''),
            'Decay 3 %': row.get('decay_3_%', ''),
            'Q-Alpha': row.get('qa', ''),
            'Q-Beta': row.get('qbm', ''),
            'Q-EC': row.get('qec', '')
        })
    except Exception as e:
        continue # skip rows that fail parsing

output_path = 'src/data/all_nuclides.json'
with open(output_path, 'w') as f:
    json.dump(nuclides, f, indent=2)

print(f"Successfully generated {output_path} with {len(nuclides)} isotopes.")
