# Pizza El Madina API contract

Base URL: `http://localhost:4000/api`. Every response is `{ success: true, data }` or `{ success: false, error: { message } }`.
All JSON fields are **camelCase**. DB columns are snake_case and converted in one place (`backend/src/util.js`).
Auth: `Authorization: Bearer <token>`. Prices are NEVER sent by the client; the server computes them.

## Public
| Method | Path | Returns |
|---|---|---|
| GET | /categories | `[{id,name,sortOrder}]` |
| GET | /products?categoryId=&bestseller=true | `[Product]` (available only) |
| GET | /products/:id | `Product & {sizes:[{id,name,price}], toppings:[{id,name,price,isAvailable}]}` |
| GET | /homepage/slides | `[{id,title,description,imageUrl,badge,buttonText,buttonLink,isActive,sortOrder}]` (active only) |
| GET | /settings | `{deliveryFee, instapayHandle}` |
| GET | /offers | `[{id,title,description,productId,discountPercent,isActive}]` |
| GET | /reviews | `[{id,rating,comment,customerName,createdAt}]` |
| POST | /cart/quote | body `{items:[CartItem]}` returns `{lines:[...], subtotal}` |

`Product` = `{id,categoryId,categoryName,name,description,basePrice,imageUrl,isAvailable,isBestseller,allowToppings,discountPercent}`
`CartItem` = `{productId,sizeId,toppingIds:[],quantity,instructions}`

## Customer (token)
| Method | Path | Notes |
|---|---|---|
| POST | /auth/register | `{name,email,phone,password}` returns `{token,user}` |
| POST | /auth/login | `{email,password}` returns `{token,user}` |
| GET | /auth/me | user |
| GET/POST/DELETE | /addresses | `{label,line1,city,notes}` |
| POST | /orders | `{orderType:'pickup'|'delivery', paymentMethod:'cash'|'instapay', phone, notes, items:[CartItem], addressId | address:{label,line1,city,notes}, saveAddress, paymentReference}` |
| GET | /orders, /orders/:id | own orders |
| POST | /orders/:id/review | `{rating 1-5, comment}`; only if order `completed`, once per order |

`Order` = `{id,orderType,paymentMethod,paymentStatus,status,subtotal,deliveryFee,total,phone,addressText,notes,paymentReference,createdAt,customerName,hasReview,items:[{id,productId,productName,sizeName,toppings:[{id,name,price}],instructions,unitPrice,quantity,lineTotal}]}`

Status: `pending → confirmed → out_for_delivery (delivery only) → completed`, or `cancelled`.
Payment: cash becomes `paid` when the order is completed. InstaPay stays `awaiting_verification` until an admin verifies it.

## Admin (admin token)
- Products: `GET /admin/products`, `POST /admin/products`, `PUT /admin/products/:id` (multipart: name, description, categoryId, basePrice, isAvailable, isBestseller, allowToppings, `sizes` = JSON string `[{name,price}]`, file field `image`), `PATCH /admin/products/:id/availability {isAvailable}`, `DELETE`.
- Categories, Toppings, Offers: `POST/PUT/DELETE /admin/categories|toppings|offers` (+ `GET /admin/toppings|offers`).
- Slides: `GET/POST/PUT/DELETE /admin/slides` (multipart, file field `image`).
- Orders: `GET /admin/orders?status=`, `PATCH /admin/orders/:id/status {status}`, `PATCH /admin/orders/:id/payment {paymentStatus}`.
- Stats: `GET /admin/stats/summary` returns `{totalSales,totalOrders,today,thisMonth,sixMonths,pendingOrders}`; `GET /admin/stats/sales?period=day|month|six_months` returns `[{label,total,orders}]`. Sales count confirmed, out_for_delivery and completed orders.

## Realtime (Socket.IO, `auth:{token}`)
- Admin receives `order:new` (full Order).
- Customer receives `order:status` `{id,status,paymentStatus}`.
