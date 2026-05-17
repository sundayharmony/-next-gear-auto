# Bill of sale PDF template

Place a fillable PDF at **`public/templates/bill-of-sale.pdf`** with AcroForm text fields named exactly as below.

Generate a starter template (dev/CI):

```bash
npx tsx scripts/generate-bill-of-sale-template.ts
```

## Required field names

| Field | Content |
|-------|---------|
| `seller_name` | Business name (NextGearAuto) |
| `seller_address` | Full seller address |
| `seller_phone` | Seller phone |
| `seller_email` | Seller email |
| `buyer_name` | Buyer full name |
| `buyer_address` | Buyer address |
| `buyer_phone` | Buyer phone |
| `buyer_email` | Buyer email |
| `vehicle_description` | Year make model (+ category) |
| `vehicle_vin` | VIN |
| `vehicle_plate` | License plate |
| `vehicle_color` | Color |
| `vehicle_mileage` | Mileage at listing |
| `odometer` | Odometer at sale |
| `sale_price` | Sale amount (formatted) |
| `sale_date` | Sale date (US format) |
| `payment_method` | How buyer paid |
| `notes` | Optional admin notes |

Field names are also exported from [`src/lib/vehicle-sale/bill-of-sale-fields.ts`](../src/lib/vehicle-sale/bill-of-sale-fields.ts).
