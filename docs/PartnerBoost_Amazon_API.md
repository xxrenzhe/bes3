# API (Amazon)
APIs that allow access to platform functionalities

Servers：https://app.partnerboost.com

## Get Products API
POST /api/datafeed/get_fba_products

Request body
{
  "token": "",
  "page_size": 20,
  "page": 1,
  "default_filter": 0,
  "country_code": "",
  "brand_id": null,
  "sort": "",
  "asins": "",
  "relationship": 1,
  "is_original_currency": 0,
  "has_promo_code": 0,
  "has_acc": 0,
  "filter_sexual_wellness": 0
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": {
    "list": [
      {
        "product_id": "007d030d256e3e35774d65822f89c778",
        "product_name": "Midea MERC07C4BAWW 7.0 Cubic Feet Chest Freezer Cu.ft-Convertible, White 7.0 Cu.ft-Convertible",
        "image": "https://m.media-amazon.com/images/I/21iIQfKFRmL._SS500_.jpg",
        "asin": "B0CQT26VCW",
        "discount": "0%",
        "discount_code": null,
        "coupon": null,
        "commission": "10%",
        "category": "Appliances",
        "subcategory": "Chest Freezers",
        "parent_asin": "B0DK1Z5TLX",
        "variant_asin": "B0CQT1JGQQ,B00MVVITWC,B0CQT2VXS8",
        "availability": "IN_STOCK",
        "rating": "4.4",
        "reviews": "10196",
        "url": "https://www.amazon.com/dp/B0CQT26VCW",
        "brand_id": "90863",
        "brand_name": "Midea_US",
        "update_time": "2025-03-18",
        "country_code": "US",
        "relationship": 1,
        "original_price": "$269.99",
        "discount_price": "$269.99",
        "currency": "USD",
        "acc_commission": "23%",
        "acc_start_date": "2025-07-15T00:00:00-07:00",
        "acc_end_date": "2025-07-31T00:00:00-07:00",
        "promo_code_list": [
          {
            "promotion_title": "MPC-S Percentage Off 2025/01/02 2-48-59-631",
            "tracking_id": "PLM-1fe2b2df-333-111-222",
            "promo_code": "Codes1",
            "buyer_gets": "0.2",
            "promo_code_start_time": "2025-04-09T10:00:00-07:00",
            "promo_code_end_time": "2025-04-19T11:00:00-07:00",
            "redemptions_per_customer": 1,
            "can_combine_with_coupon": false,
            "promotional_price": "$199.99"
          }
        ]
      }
    ],
    "has_more": true
  }
}


## Get Products Link (Product ID) API
POST /api/datafeed/get_fba_products_link

Request body
{
  "token": "",
  "product_ids": "007d030d256e3e35774d65822f89c778",
  "uid": "123"
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": [
    {
      "product_id": "007d030d256e3e35774d65822f89c778",
      "link": "https://www.amazon.com/dp/B0CQT26VCW?maas=maas_adg_api_588397405087409390_static_12_201&ref_=aa_maas&aa_campaignid=7bb4254d6ba7ff445e3b8c3fd3ac9a98&aa_adgroupid=5a19kG_aIdGFJrujZS3rjehf1RoROk2O8_bveeZQSggsULwwlmW2JT7vMOckEw0A_a1I_bNTErmMiVHobJT9S53Tvx7WFDtBnEGLhIcLwA8_c&aa_creativeid=935buodNOa3UBB44KRoWnu_bYkP8_bMXt4ZTPVPghyBl19Qw_c_c",
      "link_id": "5a19kG_aIdGFJrujZS3rjehf1RoROk2O8_bveeZQSggsULwwlmW2JT7vMOckEw0A_a1I_bNTErmMiVHobJT9S53Tvx7WFDtBnEGLhIcLwA8_c"
    }
  ],
  "error_list": [
    {
      "product_id": "111",
      "message": "Product not found or no relationship"
    }
  ]
}

## Get Products Link (ASIN) API
POST /api/datafeed/get_amazon_link_by_asin

Request body
{
  "token": "",
  "asins": "B0CQT26VCW",
  "country_code": "US",
  "uid": "",
  "return_partnerboost_link": 0
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": [
    {
      "asin": "B0CQT26VCW",
      "link": "https://www.amazon.com/dp/B0CQT26VCW?maas=maas_adg_api_588397405087409390_static_12_201&ref_=aa_maas&aa_campaignid=7bb4254d6ba7ff445e3b8c3fd3ac9a98&aa_adgroupid=2ff9hHMP1uL7XgpmaCERzIlQ1gFQhwaNuCOb_bPEa6NfGIuU7Bbf9zjFW7tyPCyNUCPDH_bvW16vdcA8fMoxkYd7xpkgc9UhIkEXU_c&aa_creativeid=dac8duY81rA4IshIP_bqE2mv5Ytpr5sysBmRrTlNvZ_aqJJw_c_c",
      "partnerboost_link": "",
      "link_id": "2ff9hHMP1uL7XgpmaCERzIlQ1gFQhwaNuCOb_bPEa6NfGIuU7Bbf9zjFW7tyPCyNUCPDH_bvW16vdcA8fMoxkYd7xpkgc9UhIkEXU_c"
    }
  ],
  "error_list": [
    {
      "asin": "B0CQ2JMS731",
      "country_code": "US",
      "message": "Product not found or no relationship"
    }
  ]
}

## Get Partnered Brands API
POST /api/datafeed/get_amazon_joined_brands

Request body
{
  "token": "",
  "bids": "90863",
  "page_size": 20,
  "page": 1
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": {
    "list": [
      {
        "bid": "90863",
        "brand_name": "Midea_US",
        "support_storefront_link": "yes"
      }
    ],
    "hasMore": false
  }
}

## Get Storefront Link API
POST /api/datafeed/get_fba_brand_link

Request body
{
  "token": "",
  "bids": "90863",
  "uid": "zxf"
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": [
    {
      "bid": "90863",
      "brand_name": "Midea_US",
      "storefront_link": "https://www.amazon.com/stores/page/4F6A19CF-5B7B-4D5A-A739-6EA8B46D4560?maas=maas_adg_api_588397405087409390_static_12_201&ref_=aa_maas&aa_campaignid=7bb4254d6ba7ff445e3b8c3fd3ac9a98&aa_adgroupid=2356UTnKtRt_atVWUJCB5mBgYP6bhTuU91YCLgLd4zZQclplXKUty8YgXL5jjRlmjAbAnmAIFPb8q8JDGvvng99S903nog6k_c&aa_creativeid=637dieeq0c4i6ixtDSenAFsbhq2B_b8YIAKYX2k0DMMMlKw_c_c",
      "storefront_short_link": "https://pboost.me/JqLDkvht?uid=zxf",
      "link_id": "2356UTnKtRt_atVWUJCB5mBgYP6bhTuU91YCLgLd4zZQclplXKUty8YgXL5jjRlmjAbAnmAIFPb8q8JDGvvng99S903nog6k_c"
    }
  ],
  "error_list": [
    {
      "bid": "77",
      "brand_name": "test bid",
      "message": "Bid not found or no relationship."
    }
  ]
}

## Link Status API
POST /api/datafeed/get_amazon_link_status

Request body
{
  "token": "",
  "link_ids": "2ff9hHMP1uL7XgpmaCERzIlQ1gFQhwaNuCOb_bPEa6NfGIuU7Bbf9zjFW7tyPCyNUCPDH_bvW16vdcA8fMoxkYd7xpkgc9UhIkEXU_c"
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": [
    {
      "link_id": "2ff9hHMP1uL7XgpmaCERzIlQ1gFQhwaNuCOb_bPEa6NfGIuU7Bbf9zjFW7tyPCyNUCPDH_bvW16vdcA8fMoxkYd7xpkgc9UhIkEXU_c",
      "active": true,
      "asin": "B0CQT26VCW",
      "brand_id": 90863,
      "link": "https://www.amazon.com/dp/B0CQT26VCW?maas=maas_adg_api_588397405087409390_static_12_201&ref_=aa_maas&aa_campaignid=7bb4254d6ba7ff445e3b8c3fd3ac9a98&aa_adgroupid=2ff9hHMP1uL7XgpmaCERzIlQ1gFQhwaNuCOb_bPEa6NfGIuU7Bbf9zjFW7tyPCyNUCPDH_bvW16vdcA8fMoxkYd7xpkgc9UhIkEXU_c&aa_creativeid=dac8duY81rA4IshIP_bqE2mv5Ytpr5sysBmRrTlNvZ_aqJJw_c_c",
      "country": "US",
      "type": "product",
      "uid": ""
    }
  ]
}

## Amazon Report API
POST /api/datafeed/get_amazon_report

Request body
{
  "token": "",
  "page_size": 100,
  "page": 1,
  "start_date": "20241201",
  "end_date": "20241202",
  "marketplace": "",
  "asins": "",
  "adGroupIds": "",
  "order_ids": ""
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": {
    "list": [
      {
        "asin": "B0C6DHK68Q",
        "date": "20241202",
        "marketplace": "US",
        "currency": "USD",
        "estCommission": 0,
        "sales": 0,
        "quantity": 0,
        "conversionRate": "0.00%",
        "clicks": 4,
        "addToCarts": 0,
        "detailPageViews": 2,
        "productConversionType": "Promoted",
        "link": "https://www.amazon.com/dp/B0DFG2WDQH?maas=maas_adg_api_587256918045045545_static_12_201&ref_=aa_maas&aa_campaignid=9ed9b01b7ef4ea6c8bd5a019aaaf5e79&aa_adgroupid=a6e3PBLq_ayRy2ZHjkvNvuSc3HqaLxHWh7tZO1jvSwkhTmyEsUJtgQga1fQOAqndyCMTs_aBKOVU6OLQmWZeLPfEGF9URtJkGJAQEXdWdQjhj5U2Jv7PmcjWf1Wgw6UYyiGHT3WvI_c&aa_creativeid=8d72gyN8ZqN4r28Wlm7WXeNtleW707bz9P6AmNUgjuZuoNZ_c",
        "uid": "sherry",
        "adGroupId": "a6e3PBLq_ayRy2ZHjkvNvuSc3HqaLxHWh7tZO1jvSwkhTmyEsUJtgQga1fQOAqndyCMTs_aBKOVU6OLQmWZeLPfEGF9URtJkGJAQEXdWdQjhj5U2Jv7PmcjWf1Wgw6UYyiGHT3Wvz_c",
        "order_id": "C1TIP-PJ09161555"
      }
    ]
  }
}


## Associates ASIN List API
POST /api/datafeed/get_latest_associates_products

Request body
{
  "token": "",
  "page_size": 200,
  "page": 1,
  "filter_sexual_wellness": 0,
  "region": "us"
}

Responses
{
  "status": {
    "code": 0,
    "msg": "success"
  },
  "data": {
    "list": [
      {
        "brand_name": "cololight",
        "asin": "B0DT9Q7CT2",
        "commission": 0.15,
        "region": "us",
        "net_commission": 0.03,
        "start_date": "2025-10-09T10:00:00-07:00",
        "end_date": "2025-10-19T11:00:00-07:00",
        "acc_commission_rate": 0.12,
        "acc_start_date": "2025-08-01",
        "acc_end_date": "2025-12-31",
        "acc_budget": "10000.00",
        "acc_spend": "518.80",
        "acc_currency": "USD"
      }
    ]
  }
}