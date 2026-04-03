# Transaction API
Summary
You can use this API to pull detailed transactions, commission status and many more.
Request Information
Website
https://app.partnerboost.com/api.php?mod=medium&op=transaction

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

POST application/json

GET

Required Parameters
Name Description
token
begin_date Transaction period. Format: YYYY-MM-DD. Either transaction period or validation period is mandatory.
end_date Format: YYYY-MM-DD
validation_date_begin Validation period. Format: YYYY-MM-DD. Either transaction period or validation period is mandatory.
validation_date_end Format: YYYY-MM-DD

Optional Parameters to Filter
Name
Description
type
Return Format

Available Filter:
- json (default)
- xml
order_id
Order ID
status
Commission Status

Available Filter:
- Pending
- Approved
- Rejected
- Normal
- All
uid
uid, your custom tracking variable.
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
page
Current page index
limit
Number of transactions shown per page - max 2000 transactions per page
Return parameters
Name
Description
channel_id
Channel ID
total_page
Total number of pages
total_trans
Total number of sales transactions
total_items
Total transactions broken down by items
partnerboost_id
PartnerBoost system unique ID
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
merchant_name
Brand Name
order_id
Order ID
order_time
Transaction Time
sale_amount
Sale Amount
sale_comm
Sale Commission
status
Commission Status
uid
uid, your custom tracking variable
uid2
uid2, your custom tracking variable
uid3
uid3, your custom tracking variable
uid4
uid4, your custom tracking variable
uid5
uid5, your custom tracking variable
click_ref
Unique Click Id
prod_id
Product ID
order_unit
Order Unit Amount
comm_rate
Commission Rate
validation_date
Date the transaction validated
note
Reason for status change
customer_country
Customer country. If empty, it means the merchant does not provide
voucher_code
Code used at checkout
paid_status
Whether this transaction has been paid to publishers. 1 = paid. 0 = not paid.
last_update_time
The latest time we update the transaction status from the advertiser.
voucher_code
Code used at checkout
Result Code
Return Code
Description
0
Success
1000
Publisher does not exist
1001
Invalid token
1002
Call frequency too high
1003
Missing required parameters or incorrect format
1005
uid can not exceed 200 characters
1006
Query time span cannot exceed 62 days
Return Format
          
{
            status: {
              code: 0,
              msg: "Success",
            },
            data: {
              total_page: 8,
              total_trans: 15,
              total_items: 15,
              limit: 2,
              list: [
                {
                  channel_id: "PB00039713",
                  partnerboost_id: "1f2ad6516f8631db3dc78532058e6ece7",
                  brand_id: "66303",
                  mcid: "24sevres",
                  merchant_name: "24S Worldwide",
                  order_id: "ZQ74TU21",
                  order_time: "1608274140",
                  sale_amount: "369.73",
                  sale_comm: "41.40",
                  status: "Pending",
                  uid: "09753e5e73f9d182709c7d26c23c56921",
                  uid2: "",
                  uid3: "",
                  uid4: "",
                  uid5: "",
                  click_ref: "pb_dk3d",
                  prod_id: "ABDVJM7ZGOLLLLLL00",
                  order_unit: "1",
                  comm_rate: "11.20%",
                  validation_date: "02-10-2023",
                  note: "order returned",
                  customer_country: "US",
                  voucher_code: "Pollenation blog SF 08/2021",
                  paid_status: 1,
                  last_update_time: "02-10-2023",
                },
                {
                  channel_id: "PB00039714",
                  partnerboost_id: "144be4691b04875d4605977a968804a32",
                  brand_id: "66303",
                  mcid: "odakyu",
                  merchant_name: "Odakye",
                  order_id: "EC201218401838061",
                  order_time: "1608223560",
                  sale_amount: "27.00",
                  sale_comm: "0.43",
                  status: "Pending",
                  uid: "cf4ae62a3b1b2a46a8785d4417a5c8881",
                  uid2: "",
                  uid3: "",
                  uid4: "",
                  uid5: "",
                  click_ref: "pb_dk3d",
                  prod_id: "1012021265",
                  order_unit: "1",
                  comm_rate: "1.60%",
                  validation_date: "02-10-2023",
                  note: "order returned",
                  customer_country: "US",
                  voucher_code: "Pollenation blog SF 08/2021",
                  paid_status: 0,
                  last_update_time: "02-10-2023",
                },
              ],
            },
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root>
            <status>
                <code>0</code>
                <msg>Success</msg>
            </status>
            <data>
              <total_page>8</total_page>
              <total_trans>15</total_trans>
              <total_items>15</total_items>
              <limit>2</limit>
              <list>
                <item>
                  <channel_id>PB00039713</channel_id>
                  <partnerboost_id>1f2ad6516f8631db3dc78532058e6ece7</partnerboost_id>
                  <mid>66303</mid>
                  <mcid>24sevres</mcid>
                  <merchant_name>24S Worldwide</merchant_name>
                  <order_id>ZQ74TU21</order_id>
                  <order_time>1608274140</order_time>
                  <sale_amount>369.73</sale_amount>
                  <sale_comm>41.40</sale_comm>
                  <status>Pending</status>
                  <uid>09753e5e73f9d182709c7d26c23c56921</uid>
                  <uid2></uid2>
                  <uid3></uid3>
                  <uid4></uid4>
                  <uid5></uid5>
                  <click_ref>pb_dk32</click_ref>
                  <prod_id>ABDVJM7ZGOLLLLLL00</prod_id>
                  <order_unit>1</order_unit>
                  <comm_rate>11.20%</comm_rate>
                  <validation_date>02-10-2023</validation_date>
                  <note>order returned</note>
                  <customer_country>US</customer_country>
                  <voucher_code>Pollenation blog SF 08/2021</voucher_code>
                  <paid_status>1</paid_status>
                  <last_update_time>02-10-2023</last_update_time>
                  </item>
                <item>
                  <channel_id>PB00039714</channel_id>
                  <partnerboost_id>144be4691b04875d4605977a968804a32</partnerboost_id>
                  <mcid>odakyu</mcid>
                  <merchant_name>Odakyu</merchant_name>
                  <order_id>EC201218401838061</order_id>
                  <order_time>1608223560</order_time>
                  <sale_amount>27.00</sale_amount>
                  <sale_comm>0.43</sale_comm>
                  <status>Pending</status>
                  <uid>cf4ae62a3b1b2a46a8785d4417a5c8881</uid>
                  <uid2></uid2>
                  <uid3></uid3>
                  <uid4></uid4>
                  <uid5></uid5>
                  <click_ref>pb_dk32</click_ref>
                  <prod_id>1012021265</prod_id>
                  <order_unit>1</order_unit>
                  <comm_rate>1.60%</comm_rate>
                  <validation_date>02-10-2023</validation_date>
                  <note>order returned</note>
                  <customer_country>US</customer_country>
                  <voucher_code>Pollenation blog SF 08/2021</voucher_code>
                  <paid_status>0</paid_status>
                  <last_update_time>02-10-2023</last_update_time>
                  </item>
              </list>
            </data>
          </root>


# Click Report API
Summary
You can use this API to pull detailed click log
Request Information
Website
https://app.partnerboost.com/api.php?mod=medium&op=transfer

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

POST application/json

GET

Required Parameters
Name Description
token
begin_date Format: YYYY-MM-DD HH:mm:ss
end_date Format: YYYY-MM-DD HH:mm:ss

Return parameters
Name Description
channel_id Channel ID
total_page Total number of pages
total_items Total transactions broken down by items
brand_id Brand ID, a series of numbers, like 66303
mcid Unique identifier for the brand, a series of characters, like ulike0
mid Deprecated, for removal. This parameter is subject to removal in a future version.
merchant_name Brand Name
uid uid, your custom tracking variable (tag)
click_time The time the customer clicks your link, in UTC+8 timezone\n
click_ref A unique transaction reference identification

Result Code 
Return Code Description
0 Success
1000 Publisher does not exist
1001 Invalid token
1002 Call frequency too high
1003 Missing required parameters or incorrect format
1005 uid can not exceed 200 characters
1011 The span of start and end date parameter values cannot exceed one hour
1012 No more than ten requests per minute

Return Format
          
{
            status: {
              code: 0,
              msg: "Success",
            },
            data: {
              total_items: 1,
              list: [
                {
                  channel_id: "PB00039713",
                  click_time: "2022-11-01 14:49:17",
                  merchant_name: "24S Worldwide",
                  brand_id: "66303",
                  mid: "24sevres",
                  mcid: "24sevres",
                  click_ref: "pb_xx95",
                  uid: "",
                },
              ],
            },
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
            <root>
                <status>
                    <code>0</code>
                    <msg>Success</msg>
                </status>
                <data>
                    <total_items>1</total_items>
                    <list>
                        <item>
                            <channel_id>PB00039713</channel_id>
                            <click_time>2022-11-01 14:49:17</click_time>
                            <merchant_name>yuyao985</merchant_name>
                            <brand_id>66303</brand_id>
                            <mid>24sevres</mid>
                            <mcid>24sevres</mcid>
                            <click_ref>pb_xx95</click_ref>
                            <uid></uid>
                        </item>
                    </list>
                </data>
            </root>

# Monetization API
Summary
You can use this API to check brand details status and acquire campaign links to monetize your traffic.
Request Information
Website
https://app.partnerboost.com/api.php?mod=medium&op=monetization_api

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

POST application/json

GET

Required Parameters
Name Description
token

Optional Parameters to Filter
Name Description
type 
Return Format
Available Filter:
- json (default)
- xml
brand_type
Brand types:
- TikTok
- DTC
- Amazon
- Walmart
- Indirect
approval_type
Filter by approval type.

Available Filter:
- Auto
- Manual
offer_type
Filter by brand pricing model.

Available Filter:
- CPS
- CPA
- CPC
- CPL
- CPX
- CPM
relationship
Filter by your current brand relationship.

Available Filter:
- Joined
- Pending
- Rejected
- No Relationship
categories
Filter by brand categories. The parameters contain special characters, please use URL encoder.

Available Filter:
- Adult
- Adult>Adult
- Adult>Apparel
- Adult>Books
- Adult>Entertainment
- Appliances & Electrical
- Appliances & Electrical>Accessories
- Appliances & Electrical>Appliances & Electrical
- Appliances & Electrical>Audio & Video
- Appliances & Electrical>Computers
- Appliances & Electrical>Domestic appliances
- Appliances & Electrical>Health Care
- Appliances & Electrical>Kitchen
- Appliances & Electrical>Multimedia
- APPs
- APPs>APPs
- APPs>Games
- APPs>Movie & TV
- APPs>Shopping
- Art & Entertainment
- Art & Entertainment>Art & Entertainment
- Art & Entertainment>Astrology
- Art & Entertainment>Books & Magazines
- Art & Entertainment>Collectibles & Hobbies
- Art & Entertainment>Communities
- Art & Entertainment>Events
- Art & Entertainment>Games
- Art & Entertainment>Gifts
- Art & Entertainment>Lifestyle
- Art & Entertainment>Movies
- Art & Entertainment>Music
- Art & Entertainment>Party Goods
- Art & Entertainment>Photography
- Art & Entertainment>Tickets & Shows
- Auction & Used Goods
- Auction & Used Goods>Art
- Auction & Used Goods>Auction & Used Goods
- Auction & Used Goods>Collectibles
- Auction & Used Goods>Jewelry
- Auction & Used Goods>Musical Instruments
- Auction & Used Goods>Outdoors
- Auto
- Auto>Accessories
- Auto>Auto
- Auto>Automobiles & Auto Services
- Auto>Cars
- Auto>Consumables
- Auto>Insurance
- Auto>Motorcycles
- Auto>Recreational Vehicles
- Auto>Rentals
- Auto>Tools & Supplies
- Auto>Trucks
- Business & Career
- Business & Career>B2B
- Business & Career>Business & Career
- Business & Career>Marketing
- Business & Career>Military
- Business & Career>Office
- Business & Career>Productivity Tools
- Business & Career>Property
- Business & Career>Real Estate
- Clothing & Accessories
- Clothing & Accessories>Apparel
- Clothing & Accessories>Bags
- Clothing & Accessories>Beauty
- Clothing & Accessories>Children
- Clothing & Accessories>Clothing & Accessories
- Clothing & Accessories>Handbags
- Clothing & Accessories>Jewelry
- Clothing & Accessories>Lingerie
- Clothing & Accessories>Shoes
- Clothing & Accessories>Sportswear
- Clothing & Accessories>Swimwear
- Clothing & Accessories>Watches
- Computers & Electronics
- Computers & Electronics>Accessories & Peripherals
- Computers & Electronics>Computers & Electronics
- Computers & Electronics>Gaming
- Computers & Electronics>Software
- Computers & Electronics>Technology
- Dating & Romance
- Dating & Romance>Dating & Romance
- Department stores
- Department stores>Beauty
- Department stores>Department stores
- Department stores>Electronics
- Department stores>Fashion
- Department stores>Health
- Department stores>Home & Garden
- Eco-Friendly
- Eco-Friendly>Apparel & Accessories
- Eco-Friendly>Eco-Friendly
- Eco-Friendly>Food & Gifts
- Education
- Education>Education
- Education>Kids
- Education>Languages
- Education>Online Courses
- Finance & Insurance & Legal Services
- Finance & Insurance & Legal Services>Banking & Tra
- Finance & Insurance & Legal Services>Credit Cards
- Finance & Insurance & Legal Services>Finance & Ins
- Finance & Insurance & Legal Services>Investment
- Finance & Insurance & Legal Services>Legal Service
- Finance & Insurance & Legal Services>Loans
- Finance & Insurance & Legal Services>Loans & Finan
- Finance & Insurance & Legal Services>Property
- Finance & Insurance & Legal Services>Real Estate S
- Finance & Insurance & Legal Services>Tax Services
- Food & Drink
- Food & Drink>Cooking
- Food & Drink>Food & Drink
- Gifts & Flowers
- Gifts & Flowers>Gadgets
- Gifts & Flowers>Gift cards
- Gifts & Flowers>Gifts & Flowers
- Gifts & Flowers>Toys
- Health & Beauty
- Health & Beauty>Bath & Body
- Health & Beauty>Cosmetics
- Health & Beauty>Diet & Nutrition
- Health & Beauty>Equipment
- Health & Beauty>Food
- Health & Beauty>Health & Beauty
- Health & Beauty>Pharmaceuticals
- Health & Beauty>Spa & Personal Grooming
- Home & Garden
- Home & Garden>Bedding
- Home & Garden>DIY
- Home & Garden>Electricals
- Home & Garden>Furniture & Home Decor
- Home & Garden>Home & Garden
- Home & Garden>Home Appliances
- Home & Garden>Home Improvement
- Home & Garden>Household Essentials & Services
- Home & Garden>Kitchen & Dining
- Home & Garden>Real Estate
- Home & Garden>Utilities
- Internet Services
- Internet Services>Ecommerce
- Internet Services>Internet Services
- Internet Services>Services
- Internet Services>Software
- Internet Services>Web Hosting
- Non-Profit
- Non-Profit>Charitable
- Non-Profit>Charitable Causes
- Non-Profit>Non-Profit
- Online Services & Software
- Online Services & Software>Computers
- Online Services & Software>Education, Training & R
- Online Services & Software>Lead Gen
- Online Services & Software>Online Gaming
- Online Services & Software>Online Services & Softw
- Online Services & Software>Telecommunications
- Online Services & Software>Web Hosting
- Others
- Others>Others
- People & Society
- People & Society>People & Society
- Pets
- Pets>Pet Services
- Pets>Pet Supplies
- Pets>Pets
- Sports & Fitness & outdoors
- Sports & Fitness & outdoors>Apparel
- Sports & Fitness & outdoors>Apparel & Accessories
- Sports & Fitness & outdoors>Cycling
- Sports & Fitness & outdoors>Exercise & Health
- Sports & Fitness & outdoors>Golf
- Sports & Fitness & outdoors>Recreation
- Sports & Fitness & outdoors>Sports & Exercise Equi
- Sports & Fitness & outdoors>Sports & Fitness & out
- Sports & Fitness & outdoors>Sports Clothing
- Toys & kids
- Toys & kids>Baby Clothing
- Toys & kids>Baby Essentials
- Toys & kids>Baby Products
- Toys & kids>Educational
- Toys & kids>Electronic Games
- Toys & kids>Games & Toys
- Toys & kids>Toys & kids
- Travel
- Travel>Accessories & Services
- Travel>Accommodations
- Travel>Airlines
- Travel>Airport Parking
- Travel>Camping
- Travel>Car Rental
- Travel>Hotels
- Travel>Lead Gen
- Travel>Tickets
- Travel>Tourism & Attractions
- Travel>Transportation
- Travel>Travel
- Travel>Travel Agencies
country
Filter by country. Please enter two-letter country code.

Example: US, CA, FR, UK, AU
page
Current page index
limit
Number of campaigns shown per page - max 2000 campaigns per page
Return parameters
Name
Description
brand_type
Brand types: TikTok,DTC, Amazon, Indirect, Walmart
total_mcid
Total number of brands called
total_page
Total number of pages
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
mid
Deprecated, for removal. This parameter is subject to removal in a future version.
merchant_name
Brand Name
comm_rate
Commission Rate
comm_detail
Commission Detail
site_url
Brand homepage url
logo
Brand Logo
categories
Brand categories
tags
Subcategories and keywords of the brand
offer_type
Brand pricing model
network_partner
Network of the Affiliate Program
avg_payment_cycle
The average days it takes for commissions approved and paid by the brands
avg_payout
Average commission rate on PartnerBoost. Formula: (Commission)/(Sale Amount)
country
Country
support_region
Support Region
brand_status
Brand Status (Online or Offline)
datetime
Date joined/removed from the program
relationship
Your brand relationship
tracking_url
Your campaign tracking link
tracking_url_short
Your campaign short link
RD
Cookie duration
site_desc
Description of the program
filter_words
Filter words
currency_name
The currency the program is set to track in
allow_sml
Whether or not deep linking is enabled
post_area_list
The country the brand will ship to
rep_name
The name of the contact for the brand
rep_email
The email address for the brand
support_couponordeal
Whether this brand allows traffic from coupon or deal sites. 1 = allowed. 0 = not allowed. "-" = unknown.
Result Code
Return Code
Description
0
Success
4001
Start date format is wrong
4002
End date format is wrong
9999
API limit
Return Format
          
{
            "status":{
                "code":0,
                "msg":"Success"
            },
            "data":{
                "total_mcid":"13",
                "total_page":7,
                "limit":2,
                "list":[
                {
                  "brand_type":"amz",
                  "brand_id":"66303",
                  "mcid":"247tickets",
                  "mid":"66303",
                  "merchant_name":"247Tickets",
                  "comm_rate":"Revshare 75%",
                  "site_url":"https://www.247tickets.com/",
                  "logo":"https://cdn.partnerboost.com/data/mc_logo/247tickets.png",
                  "categories":"Other",
                  "tags":"Airlines|Clothing",
                  "offer_type":"CPS",
                  "network_partner": "partnerboost",
                  "avg_payment_cycle":"90",
                  "avg_payout":"3%",
                  "country":"CN",
                  "support_region":"China",
                  "merchant_status":"Online",
                  "datetime":"1623211075",
                  "relationship":"Joined",
                  "tracking_url":"https://app.partnerboost.com/track/1385ih_aUHmvvCKta1JBnlvH39RsK3MuMboAurKOy_bdh63wwXs6gBu8xQQtc3VFxluUxo?url=https%3A%2F%2Fwww.247tickets.com%2F",
                  "tracking_url_short":"",
                  "RD": "1",
                  "site_desc": "Description...",
                  "filter_words": "name",
                  "currency_name": "CNY",
                  "allow_sml": "1",
                  "post_area_list": "US",
                  "rep_name": "Jacob",
                  "rep_email": "https://jacob@partnerboost.com",
                  "support_couponordeal": "1",
                },
                {
                  "brand_type":"amz",
                  "brand_id":"66303",
                  "mcid":"cotton",
                  "mid":"66303",
                  "merchant_name":"全棉时代",
                  "comm_rate":"Revshare 75%",
                  "site_url":"https://www.purcotton.com",
                  "logo":"https://cdn.partnerboost.com/data/mc_logo/cotton.png",
                  "categories":"Home & Living",
                  "tags":"Airlines|Clothing",
                  "offer_type":"CPS",
                  "network_partner": "partnerboost",
                  "avg_payment_cycle":"30",
                  "avg_payout":"1.21%",
                  "country":"CN",
                  "support_region":"China",
                  "merchant_status":"Online",
                  "datetime":"1623211045",
                  "relationship":"Joined",
                  "tracking_url":"https://app.partnerboost.com/track/96d9cKKEQpo8dmFkSrL4XaS_aLvgLnYLfPJ_aJ_bMhCwqG6_bbEK8nvrGzX92MO6QHE_c?url=https%3A%2F%2Fwww.purcotton.com",
                  "tracking_url_short":"",
                  "RD": "1",
                  "site_desc": "Description...",
                  "filter_words": "name",
                  "currency_name": "CNY",
                  "allow_sml": "1",
                  "post_area_list": "US",
                  "rep_name": "Jacob",
                  "rep_email": "https://jacob@partnerboost.com",
                  "support_couponordeal": "1",
                }
              ]
            }
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root>
            <status>
              <code>0</code>
              <msg>Success</msg>
            </status>
            <data>
              <total_mcid>13</total_mcid>
              <total_page>7</total_page>
              <limit>2</limit>
              <list>
                <item>
                  <brand_type>amz</brand_type>
                  <brand_id>66303</brand_id>
                  <mcid>247tickets</mcid>
                  <mid>66303</mid>
                  <merchant_name>247Tickets</merchant_name>
                  <comm_rate>Revshare 75%</comm_rate>
                  <site_url>https://www.247tickets.com/</site_url>
                  <logo>https://cdn.partnerboost.com/data/mc_logo/247tickets.png</logo>
                  <categories>Other</categories>
                  <tags>Airlines|Clothing</tags>
                  <offer_type>CPS</offer_type>
                  <network_partner>partnerboost</network_partner>
                  <avg_payment_cycle>90</avg_payment_cycle>
                  <avg_payout>3%</avg_payout>
                  <country>CN</country>
                  <support_region>China</support_region>
                  <merchant_status>Online</merchant_status>
                  <datetime>1623211075</datetime>
                  <relationship>Joined</relationship>
                  <tracking_url>https://app.partnerboost.com/track/d8c3Qqp7JL88UvOBZYTYD1O3_a17GBCpdWdKF5vrPXvKJ4t_bwQDy_aZM_bJdI7bQuhvgKxf?url=https%3A%2F%2Fwww.247tickets.com%2F</tracking_url>
                  <tracking_url_short></tracking_url_short>
                  <RD>1</RD>
                  <site-desc>Description...</site-desc>
                  <filter-words>name</filter-words>
                  <currency-name>CNY</currency-name>
                  <allow-sml>1</allow-sml>
                  <post-area-list>US</post-area-list>
                  <rep-name>Jacob</rep-name>
                  <rep-email>https://jacob@partnerboost.com</rep-email>
                  <support_couponordeal>1</support_couponordeal>
                </item>
                <item>
                  <brand_type>amz</brand_type>
                  <brand_id>66303</brand_id>
                  <mcid>cotton</mcid>
                  <mid>66303</mid>
                  <merchant_name>全棉时代</merchant_name>
                  <comm_rate>Revshare 75%</comm_rate>
                  <site_url>https://www.purcotton.com</site_url>
                  <logo>https://cdn.partnerboost.com/data/mc_logo/cotton.png</logo>
                  <categories>Home  Living</categories>
                  <tags>Airlines|Clothing</tags>
                  <offer_type>CPS</offer_type>
                  <network_partner>partnerboost</network_partner>
                  <avg_payment_cycle>30</avg_payment_cycle>
                  <avg_payout>1.21%</avg_payout>
                  <country>CN</country>
                  <support_region>China</support_region>
                  <merchant_status>Online</merchant_status>
                  <datetime>1623211045</datetime>
                  <relationship>Joined</relationship>
                  <tracking_url>https://app.partnerboost.com/track/2b01gCclwO2FcNZCocS3j4uuCbaznVxJUP2_aB17Jh0D5j6SdhMGpUGyjeKxaOzA_c?url=https%3A%2F%2Fwww.purcotton.com</tracking_url>
                  <tracking_url_short></tracking_url_short>
                  <RD>1</RD>
                  <site-desc>Description...</site-desc>
                  <filter-words>name</filter-words>
                  <currency-name>CNY</currency-name>
                  <allow-sml>1</allow-sml>
                  <post-area-list>US</post-area-list>
                  <rep-name>Jacob</rep-name>
                  <rep-email>https://jacob@partnerboost.com</rep-email>
                  <support_couponordeal>1</support_couponordeal>
                </item>
              </list>
            </data>
          </root>

# Commission Validation API
Summary
This API shows approved commission breakdown by brand on a monthly basis.
Request Information
Website
https://app.partnerboost.com/api.php?mod=settlement&op=merchant_commission

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

POST application/json

GET

Required Parameters
Name
Description
token

Select a Channel
begin_date
Format: YYYY-MM-DD
end_date
Format: YYYY-MM-DD
Optional Parameters to Filter
Name
Description
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
sale_comm
Sale Commission
settlement_date
Date when commission is approved and ready for you to withdraw
note
This indicates the time period the amount is generated. It could be sales commission, bonus or paid placement.
settlement_id
A unique id indicates approved commission by merchant
Return parameters
Name
Description
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
sale_comm
Sale Commission
settlement_date
Date when commission is approved and ready for you to withdraw
note
This indicates the time period the amount is generated. It could be sales commission, bonus or paid placement.
settlement_id
A unique id indicates approved commission by merchant
Result Code
Return Code
Description
0
Success
1000
Publisher does not exist
1001
Invalid token
1002
Call frequency too high
1003
Missing required parameters or incorrect format
1006
Query time span cannot exceed 62 days
Return Format
          
{
            "status": {
              "code": 0,
              "msg": "Success"
            },
            "data": [
              {
                "brand_id": "66303",
                "mcid": "joes",
                "sale_comm": "37.73",
                "settlement_date": "2018-04-27",
                "note": "2016-01-01 ~ 2016-01-31, joes Sales Commission",
                "settlement_id": "810b2ce13d1a3b640423"
                },
              {
                "brand_id": "66304",
                "mcid": "finishline",
                "sale_comm": "17.45",
                "settlement_date": "2018-04-27",
                "note": "2016-01-01 ~ 2016-01-31, finishline Sales Commission",
                "settlement_id": "c32ff2f5ec5553bb0423"
                },
              {
                "brand_id": "66305",
                "mcid": "carters",
                "sale_comm": "1.94",
                "settlement_date": "2018-04-27",
                "note": "2016-01-01 ~ 2016-01-31, carters Sales Commission",
                "settlement_id": "236ae480049113020423"
                }
            ]
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root> 
            <status> 
              <code>0</code>  
              <msg>Success</msg>
            </status>  
            <data> 
              <item> 
                <brand_id>66303</brand_id>  
                <mcid>joes</mcid>  
                <sale_comm>37.73</sale_comm>  
                <settlement_date>2018-04-27</settlement_date>  
                <note>2016-01-01 ~ 2016-01-31, joes Sales Commission</note>  
                <settlement_id>810b2ce13d1a3b640423</settlement_id>
                </item>  
              <item> 
                <brand_id>66304</brand_id>  
                <mcid>finishline</mcid>  
                <sale_comm>17.45</sale_comm>  
                <settlement_date>2018-04-27</settlement_date>  
                <note>2016-01-01 ~ 2016-01-31, finishline Sales Commission</note>  
                <settlement_id>c32ff2f5ec5553bb0423</settlement_id>
                </item>  
              <item> 
                <brand_id>66305</brand_id>  
                <mcid>carters</mcid>  
                <sale_comm>1.94</sale_comm>  
                <settlement_date>2018-04-27</settlement_date>  
                <note>2016-01-01 ~ 2016-01-31, carters Sales Commission</note>  
                <settlement_id>236ae480049113020423</settlement_id>
                </item>
            </data> 
          </root>
    
# Commission Details API
Summary
This API allows you to use settlement ID to retrieve commission breakdown by transactions per brand.
Request Information
Website
https://app.partnerboost.com/api.php?mod=settlement&op=commission_details

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

POST application/json

GET

Required Parameters
Name
Description
token

Select a Channel
settlement_id
A unique id indicates approved commission by merchant
Optional Parameters to Filter
Name
Description
type
Return Format

Available Filter:
- json (default)
- xml
Return parameters
Name
Description
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
merchant_name
Brand Name
order_id
Order ID
order_time
Transaction Time
sale_amount
Sale Amount
sale_comm
Sale Commission
status
Commission Status
uid
uid, your custom tracking variable (tag)
prod_id
Product ID
order_unit
Order Unit Amount
settlement_id
A unique id indicates approved commission by merchant
validation_date
Date the transaction validated
note
Reason for status change
Result Code
Return Code
Description
0
Success
1000
Publisher does not exist
1001
Invalid token
1002
Call frequency too high
1003
Missing required parameters or incorrect format
1006
Query time span cannot exceed 62 days
Return Format
          
{
            "status": {
              "code": 0,
              "msg": "Success"
            },
            "data": [
              {
                "brand_id": "66306",
                "mcid": "katespade",
                "merchant_name": "Kate Spade",
                "order_id": "8720334",
                "order_time": "1502949706",
                "sale_amount": "69.00",
                "sale_comm": "5.52",
                "status": "Approved",
                "uid": "120802|00yl70cf45100529c704",
                "prod_id": "098687062527",
                "order_unit": "1",
                "settlement_id": "804a15b9ac6f5fa11113",
                "validation_date": "2021-04-05",
                "note": "order returned"
                },
              {
                "brand_id": "66307",
                "mcid": "katespade",
                "merchant_name": "Kate Spade",
                "order_id": "8720334",
                "order_time": "1502949706",
                "sale_amount": "79.00",
                "sale_comm": "6.32",
                "status": "Approved",
                "uid": "262",
                "prod_id": "098687097345",
                "order_unit": "1",
                "settlement_id": "804a15b9ac6f5fa11113",
                "validation_date": "2021-04-05",
                "note": "order returned"
                }
            ]
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root>
              <status>
                  <code>0</code>
                  <msg>Success</msg>
              </status>
              <data>
                  <item>
                      <brand_id>66306</brand_id>
                      <mcid>katespade</mcid>
                      <merchant_name>Kate Spade</merchant_name>
                      <order_id>8720334</order_id>
                      <order_time>1502949706</order_time>
                      <sale_amount>69.00</sale_amount>
                      <sale_comm>5.52</sale_comm>
                      <status>Approved</status>
                      <uid>00yl70cf45100529c704</uid>
                      <prod_id>098687062527</prod_id>
                      <order_unit>1</order_unit>
                      <settlement_id>804a15b9ac6f5fa11113</settlement_id>
                      <validation_date>2021-04-05</validation_date>
                      <note>order returned</note>
                      </item>
                  <item>
                      <brand_id>66307</brand_id>
                      <mcid>katespade</mcid>
                      <merchant_name>Kate Spade</merchant_name>
                      <order_id>8720334</order_id>
                      <order_time>1502949706</order_time>
                      <sale_amount>79.00</sale_amount>
                      <sale_comm>6.32</sale_comm>
                      <status>Approved</status>
                      <uid>00yl70cf45100529c704</uid>
                      <prod_id>098687097345</prod_id>
                      <order_unit>1</order_unit>
                      <settlement_id>804a15b9ac6f5fa11113</settlement_id>
                      <validation_date>2021-04-05</validation_date>
                      <note>order returned</note>
                      </item>
              </data>
          </root>
        
# Datafeed List API
Summary
Datafeed List   Amazon Product List   Request Download   Get Download URL
Updates
V1.0 --- 2022/06/01 --- Add Datafeed API

V1.1 --- 2024/03/05 --- 1.Add the following return parameters: brand_id, tracking_url, tracking_url_short, tracking_url_smart, updated_at - 2.Required Parameter "brand_id" becomes optional

Request Information
Website
https://app.partnerboost.com/api.php?mod=datafeed&op=list

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

POST application/json

GET

Required Parameters
Name
Description
token

Select a Channel
Optional Parameters to Filter
Name
Description
type
Return Format

Available Filter:
- json (default)
- xml
brand_type
Brand types:
- TikTok
- DTC
- Walmart
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
page
Current Page Index
limit
Number of products shown per page - max 100 products per page
keywords
Keywords
price_range
One of "0-75", "75-150", "150-300", "300-500", "500-1000", "1000+"
min_discount
One of 75, 50, 25, 10
Return parameters
Name
Description
name
Product name
description
Product description
brand_id
Brand ID, a series of numbers, like 66303
mcid
Unique identifier for the brand, a series of characters, like ulike0
merchant_name
The name of the merchant selling this product
url
The original product url
image
The link to the image of the product
sku
SKU of the product
category
Product category
price
Current price of the product
currency
Currency of the product
old_price
Old price of the product
brand
The brand associated with the product
availability
Product availability
gtin
The global trade identification number of the product
mpn
The manufacturer part number of the product
custom1
Custom information of the product
custom2
Custom information of the product
custom3
Custom information of the product
creative_id
Creative ID
tracking_url
Tracking link of the product
tracking_url_short
Short tracking link of the product
updated_at
The last time (as a Unix timestamp) the product was updated
Result Code
Return Code
Description
0
Success
1000
User not exist
1001
Invalid token
1002
Too many request
1003
Invalid input
1004
Too many input
1005
Identifier too long
Return Format
          
{
            "status": {
                "code": 0,
                "msg": "success"
            },
            "data": {
              "total": "9",
              "list": [
                  {
                      "name": "xxx0.8091063607152695",
                      "description": "zzz0.46505838643486475",
                      "brand_id": "73461",
                      "mcid":"yuyao985",
                      "merchant_name": "yuyao985",
                      "url": "http://www.yoursite.com/0.021390287827673715",
                      "image": "http://www.yoursite.com/0.5768303730817088.jpg",
                      "sku": "f5f41766",
                      "category": "",
                      "price": "34.32",
                      "currency": "EUR",
                      "old_price": "62.45",
                      "brand": "",
                      "availability": "in stock",
                      "gtin": "9783161484100",
                      "mpn": "CR2032",
                      "custom1": "",
                      "custom2": "",
                      "custom3": "",
                      "creative_id": "112345",
                      "tracking_url": "",
                      "tracking_url_short": "",
                      "updated_at": "1710122547",
                  }
              ]
            }
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root>
              <status>
                  <code>0</code>
                  <msg>success</msg>
              </status>
              <data>
                  <total>9</total>
                  <list>
                      <item>
                          <name>xxx0.8091063607152695</name>
                          <description>zzz0.46505838643486475</description>
                          <brand_id>73461</brand_id>
                          <mcid>yuyao985</mcid>
                          <merchant_name>yuyao985</merchant_name>
                          <url>http://www.zizhaolu.com/0.021390287827673715</url>
                          <image>http://www.zizhaolu.com/0.5768303730817088.jpg</image>
                          <sku>f5f41766</sku>
                          <category></category>
                          <price>34.32</price>
                          <currency>EUR</currency>
                          <old_price>62.45</old_price>
                          <brand></brand>
                          <availability>in stock</availability>
                          <gtin>9783161484100</gtin>
                          <mpn>CR2032</mpn>
                          <custom1></custom1>
                          <custom2></custom2>
                          <custom3></custom3>
                          <tracking_url></tracking_url>
                          <tracking_url_short></tracking_url_short>
                          <updated-at>1710122547</updated-at>
                      </item>
                  </list>
              </data>
          </root>
        
# Datafeed Get Amazon Product List
Summary
Datafeed List   Amazon Product List   Request Download   Get Download URL
Updates
V1.0 --- 2022/06/01 --- Add Datafeed API

Request Information
Website
https://app.partnerboost.com/api.php?mod=datafeed&op=get_amazon_link

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

Required Parameters
Name
Description
token

Select a Channel
brand_id
Brand ID
Optional Parameters to Filter
Name
Description
type
Return Format

Available Filter:
- json (default)
- xml
asin
ASIN. Multiple ASIN should be separated by commas.
UID1
Unique tag1
UID2
Unique tag2
UID3
Unique tag3
UID4
Unique tag4
UID5
Unique tag5
Return parameters
Name
Description
name
Amazon product name
link
Amazon product landing page link after opening with short link or smart link
short_link
Amazon product short link
smart_link
Amazon product smart link
image
Amazon product logo image
asin
ASIN
category
Amazon product category
price
Amazon product price
Result Code
Return Code
Description
Return Format
          
{
            "status": {
                "code": 0,
                "msg": "success"
            },
            "data": [
                {
                    "name": "Puffin - The Puffy Beverage Jacket",
                    "short_link": "https://pbee.me/2xf5",
                    "smart_link": "https://pbee.me/track/c113l_ar7l7_a3cMiI1mbfBNRqmA3TmxWbyD7zghtwFF9BPRxHD578ooHoE70HPHpb0ipcPaV2vInv5l_bO?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB0BKBW6193%3Fmaas%3Dmaas_adg_api_582944334660371168_static_12_113%26ref_%3Daa_maas%26aa_campaignid%3DPuffinDrinkwear388ca360%26aa_adgroupid%3DPartnerBoost6c48ec57c613423ca7f5c089bdae37d0%26aa_creativeid%3D886dd96987db4138a72768be7119804b",
                    "image": "https://images-na.ssl-images-amazon.com/images/I/41WI+EbNXvL.jpg",
                    "asin": "B0BKBW6193",
                    "category": "Home & Kitchen",
                    "price": "21.95"
                }
            ]
        }

        
          
<?xml version="1.0" encoding="utf-8"?>
        <root>
          <status>
            <code>
              0
            </code>
            <msg>
              success
            </msg>
          </status>
          <data>
            <item>
              <name>
                  LS166A15
              </name>
              <short_link>
                  https://pboost.me/2xm8?uid=asdasd&uid2=2ssddss
              </short_link>
              <smart_link>
                  https://app.partnerboost.com/track/5f6fWhljqp9eCD6Pcyyq9JR4_b_aeTiEifbFuOK4_bxxM1cqoNREYTme0_bm9pPoAbKZHfpQTe9IdniaH0j2gAVR?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB0B27PH93T%3Fmaas%3Dmaas_adg_api_593198355785726132_static_12_201%26ref_%3Daa_maas%26aa_campaignid%3Df3c3283b9b301351e306852868907b7d%26aa_adgroupid%3D178dzTVxVHiK2HJ_adgaLcXDPNqs_axfrtA3prbYM63KHCkUpveSWh1XDcjvG3bekDPH_b_beypvtWQ381SjfllCFuL5QReOkPs_bzIcPxw_c_c%26aa_creativeid%3D74166s97aUl4dGtYMTep9WcBir1P8OKpYC6yMQ7KaPHbzpA_c&uid=asdasd&uid2=2ssddss
              </smart_link>
              <image>
                  https://m.media-amazon.com/images/I/41wFZhZgGRL._SS500_.jpg
              </image>
              <asin>
                  B0B27PH93T
              </asin>
              <category>
                  Wall Sconces
              </category>
              <price>
                  189.00
              </price>
            </item>
          </data>
        </root>

# Datafeed Request Download API
Summary
Datafeed List   Amazon Product List   Request Download   Get Download URL
Updates
V1.0 --- 2022/06/01 --- Add Datafeed API

Request Information
Website
https://app.partnerboost.com/api.php?mod=datafeed&op=request_download

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

Required Parameters
Name
Description
token

Select a Channel
brand_id
Brand ID, a series of numbers, like 66303
Optional Parameters to Filter
Name
Description
type
Return Format

Available Filter:
- json (default)
- xml
Return parameters
Name
Description
Result Code
Return Code
Description
Return Format
          
{
            "status": {
                "code": 0,
                "msg": "success"
            },
            "data": {
                "id": 371
            }
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root>
              <status>
                  <code>0</code>
                  <msg>success</msg>
              </status>
              <data>
                  <id>371</id>
              </data>
          </root>

# Datafeed Get Download URL API
Summary
Datafeed List   Amazon Product List   Request Download   Get Download URL
Updates
V1.0 --- 2022/06/01 --- Add Datafeed API

Request Information
Website
https://app.partnerboost.com/api.php?mod=datafeed&op=get_download_url

Return Format
JSON or XML

HTTP Request
POST application/x-www-form-urlencoded

Required Parameters
Name
Description
token

Select a Channel
id
id from Request Download
Optional Parameters to Filter
Name
Description
type
Return Format

Available Filter:
- json (default)
- xml
url
File URL
status
One of OK,FAIL,PENDING
Return parameters
Name
Description
Result Code
Return Code
Description
Return Format
          
{
            "status": {
                "code": 0,
                "msg": "success"
            },
            "data": {
                "url": "https://cdn.partnerboost.com/data/xxxx.csv",
                "status": "PENDING"
            }
          }

        
          
<?xml version="1.0" encoding="utf-8"?>
          <root>
              <status>
                  <code>0</code>
                  <msg>success</msg>
              </status>
              <data>
                  <url>https://cdn.partnerboost.com/data/xxxx.csv</url>
                  <status>PENDING</status>
              </data>
          </root>