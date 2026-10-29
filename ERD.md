```mermaid
erDiagram

        CropType {
            TUBER TUBER
GRAMINEAE GRAMINEAE
TEXTILE TEXTILE
LEGUME LEGUME
OILSEED OILSEED
INDUSTRIAL INDUSTRIAL
CEREAL CEREAL
        }
    


        Labor {
            PREPARATION PREPARATION
SOWING SOWING
APPLICATION APPLICATION
UPROOTING UPROOTING
HARVEST HARVEST
        }
    


        AccountCategory {
            A A
B B
C C
        }
    


        AccountStatus {
            ACTIVE ACTIVE
INACTIVE INACTIVE
SUSPENDED SUSPENDED
PENDING PENDING
CANCELLED CANCELLED
        }
    


        LicenceStatus {
            ACTIVE ACTIVE
INACTIVE INACTIVE
EXPIRED EXPIRED
SUSPENDED SUSPENDED
        }
    


        UserState {
            ACTIVE ACTIVE
INACTIVE INACTIVE
SUSPENDED SUSPENDED
PENDING PENDING
CANCELLED CANCELLED
        }
    


        UserRole {
            ADMIN ADMIN
USER USER
        }
    


        CampaignState {
            ACTIVE ACTIVE
INACTIVE INACTIVE
CLOSED CLOSED
        }
    


        StockItemType {
            SUPPLY SUPPLY
CROP CROP
        }
    


        StockSumType {
            BOTH BOTH
ADD ADD
SUBTRACT SUBTRACT
        }
    


        WithdrawalOrderType {
            MANUAL MANUAL
AUTOMATIC AUTOMATIC
        }
    


        WithdrawalState {
            PARTIAL PARTIAL
PENDING PENDING
COMPLETED COMPLETED
        }
    


        EntityType {
            PHYSICAL PHYSICAL
LEGAL LEGAL
        }
    


        NumeratorType {
            CLIENT CLIENT
WORK_ORDER WORK_ORDER
PURCHASE_ORDER PURCHASE_ORDER
CEREAL_SALE_CONTRACT CEREAL_SALE_CONTRACT
        }
    


        LotBranchMode {
            SHARED SHARED
INDEPENDENT INDEPENDENT
        }
    


        DeviceStatus {
            ACTIVE ACTIVE
INACTIVE INACTIVE
        }
    


        InOutDirection {
            IN IN
OUT OUT
        }
    


        FuelType {
            DIESEL DIESEL
GASOLINE GASOLINE
        }
    


        CurrencyCode {
            ARS ARS
USD USD
BRL BRL
CLP CLP
EUR EUR
        }
    
  "countries" {
    String id "🗝️"
    String code 
    String descriptionES 
    String descriptionPT 
    String descriptionEN 
    String language 
    String currency 
    String taxKey 
    String taxKeyFormat 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "zip_codes" {
    Int id "🗝️"
    String code 
    String locality 
    String state 
    String countryCode 
    }
  

  "input_types" {
    Int id "🗝️"
    String code 
    String descriptionES 
    String descriptionEN 
    String descriptionPT 
    Boolean phytosanitary 
    Boolean isCrop 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "categories" {
    String id "🗝️"
    String idCategory 
    String descriptionES 
    String descriptionPT 
    String descriptionEN 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "crops" {
    String id "🗝️"
    String descriptionES 
    String descriptionPT "❓"
    String descriptionEN "❓"
    CropType cropType 
    String variety "❓"
    Labor labors 
    Boolean prepared 
    Boolean sowing 
    Boolean application 
    Boolean germination 
    Boolean harvest 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "movement_types" {
    String id "🗝️"
    String name 
    String conceptES 
    String conceptPT "❓"
    String conceptEN "❓"
    String description "❓"
    String typeMovement "❓"
    Boolean manual 
    StockSumType stockSum 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "cost_expenses" {
    String id "🗝️"
    String costCode 
    String costCenter 
    String description 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "device_types" {
    String id "🗝️"
    String model 
    String description "❓"
    String family 
    String subFamily 
    DeviceStatus status 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "vehicle_types" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "licence_types" {
    String id "🗝️"
    String label 
    String description "❓"
    String systemType "❓"
    Int maximumUnitAllowed "❓"
    Int allowedUsersCount "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "accounts" {
    String id "🗝️"
    AccountCategory category 
    String denomination 
    String countryCode 
    CurrencyCode currency 
    AccountStatus status 
    String accountReference "❓"
    String licenceNumber "❓"
    Boolean isLicenceMultipleCountry 
    Int maxHectares 
    Int maxFields 
    Int countFields 
    Int countLicences 
    Int countHectares 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "licences" {
    String id "🗝️"
    String countryCode "❓"
    Int activeUsersAllowed 
    Int amountLicencesAllowed "❓"
    LicenceStatus status 
    DateTime startDate 
    DateTime endDate 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "users" {
    String id "🗝️"
    String cognitoId 
    String email 
    String username 
    UserState state 
    UserRole role "❓"
    String language 
    Boolean isAdmin "❓"
    Boolean isInternal "❓"
    CurrencyCode currency "❓"
    String photoName "❓"
    String activeSessionId "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "companies" {
    String id "🗝️"
    String fantasyName 
    String socialReason 
    String tributaryCode 
    String address 
    String phone 
    String email 
    String locality "❓"
    String province "❓"
    String zipCode "❓"
    String website "❓"
    String observation "❓"
    String secondaryContact "❓"
    String companyLogo "❓"
    String countryCode "❓"
    String fiscalSituation "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "contracts_corporate" {
    String id "🗝️"
    String description 
    String status "❓"
    Int totalCompany "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "company_contracts" {
    String id "🗝️"
    Float participationPercentage 
    String activity "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "inputs" {
    String id "🗝️"
    String barCode "❓"
    String name 
    String description "❓"
    String brand "❓"
    String unitMeasurement "❓"
    Boolean stockByLot 
    String activePrincipal "❓"
    Float mermaVolatile "❓"
    Float minimumDose "❓"
    Float maximumDose "❓"
    Float recommendedDose "❓"
    Float replenishmentPoint "❓"
    Labor labors 
    Boolean isDefault 
    String chemicalComposition "❓"
    String toxicityClass "❓"
    String formulationDenomination "❓"
    String productUrl "❓"
    Float eiqValue "❓"
    String senasaId "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "input_crop_applications" {
    String id "🗝️"
    Float minDose "❓"
    Float maxDose "❓"
    Float suggestedDose "❓"
    }
  

  "zones" {
    String id "🗝️"
    String name 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "deposits" {
    String id "🗝️"
    String description 
    String owner "❓"
    Boolean isVirtual 
    Float lat "❓"
    Float lng "❓"
    Boolean isNegative 
    String address "❓"
    String zipCode "❓"
    String locality "❓"
    String province "❓"
    String countryCode "❓"
    Boolean hasSiloBag 
    Boolean hasHopper 
    Boolean hasSilo 
    Boolean hasDeposit 
    String taxId "❓"
    String siloBagId "❓"
    String status "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "deposit_locations" {
    String id "🗝️"
    String number "❓"
    String name 
    }
  

  "fields" {
    String id "🗝️"
    String name 
    String uuid "❓"
    Json geojson "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "field_lots" {
    String id "🗝️"
    String name 
    String uuid "❓"
    Float hectares "❓"
    String parentId "❓"
    Json coordinates "❓"
    String lotType "❓"
    }
  

  "campaigns" {
    String id "🗝️"
    String name 
    String description "❓"
    String zafra "❓"
    DateTime startDate "❓"
    DateTime endDate "❓"
    CampaignState state 
    String lotBranchId "❓"
    LotBranchMode lotBranchMode "❓"
    String lotBranchSourceCampaignId "❓"
    DateTime lotBranchPromotedAt "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "vehicles" {
    String id "🗝️"
    String make "❓"
    String model "❓"
    String modelYear "❓"
    String patent "❓"
    Float tara "❓"
    Float net "❓"
    Float gross "❓"
    String chassisNumber "❓"
    FuelType fuelType "❓"
    Float fuelCapacity "❓"
    String connectivity "❓"
    String owner "❓"
    String insurence "❓"
    String coverageType "❓"
    String policyNumber "❓"
    DateTime insurenceStartDate "❓"
    DateTime insurenceDueDate "❓"
    String location "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "vehicle_maintenances" {
    String id "🗝️"
    DateTime date "❓"
    Float km "❓"
    String description "❓"
    DateTime createdAt 
    }
  

  "vehicle_specifications" {
    String id "🗝️"
    String specification 
    String description "❓"
    }
  

  "social_entities" {
    String id "🗝️"
    String fullName "❓"
    String document "❓"
    String phone "❓"
    String taxSituation "❓"
    String email "❓"
    EntityType entityType "❓"
    String businessName "❓"
    String taxCode "❓"
    String mainContact "❓"
    String secondaryContact "❓"
    String nameMainContact "❓"
    String website "❓"
    String address "❓"
    String locality "❓"
    String zipCode "❓"
    String province "❓"
    String countryCode "❓"
    Boolean isActive 
    Boolean isEmployee 
    String fileNumber "❓"
    String licenseNumber "❓"
    String categories 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "stocks" {
    String id "🗝️"
    StockItemType itemType 
    String location "❓"
    String nroLot "❓"
    Float currentStock 
    Float reservedStock 
    DateTime lastUpdate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "stock_movements" {
    String id "🗝️"
    StockItemType itemType "❓"
    String userId "❓"
    String location "❓"
    String nroLot "❓"
    DateTime creationDate "❓"
    DateTime dueDate "❓"
    Boolean isIncome 
    String detail "❓"
    DateTime operationDate "❓"
    Float amount 
    String voucher "❓"
    CurrencyCode currency "❓"
    Float totalValue "❓"
    String hours "❓"
    String unitMeasurement "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "crop_movements" {
    String id "🗝️"
    String zafra "❓"
    InOutDirection direction 
    DateTime date "❓"
    String movement "❓"
    String detail "❓"
    Float amountKg 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "crop_deposits" {
    String id "🗝️"
    String zafra "❓"
    String location "❓"
    Float currentStockKg 
    Float reservedStockKg 
    Float currentStock 
    Float committedStock 
    Float deliveredStock 
    DateTime lastUpdate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "exit_fields" {
    String id "🗝️"
    String zafra "❓"
    String ticket "❓"
    String transportDocumentRef "❓"
    Float grossWeight "❓"
    Float tareWeight "❓"
    Float netWeight "❓"
    String location "❓"
    String additionalInformation "❓"
    Float humidityPercentage "❓"
    Float mermaPercentage "❓"
    Float volatilePercentage "❓"
    Float otherPercentage "❓"
    Float totalMerma "❓"
    Float kgNet "❓"
    DateTime creationDate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "withdrawal_orders" {
    String id "🗝️"
    WithdrawalOrderType orderType 
    String orderNumber "❓"
    String reason "❓"
    String withdrawId "❓"
    String unitMeasurement "❓"
    String zafra "❓"
    Json cropData "❓"
    String labor "❓"
    String laborNro "❓"
    WithdrawalState state 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "deposit_supply_orders" {
    String id "🗝️"
    String orderNumber "❓"
    String location "❓"
    String nroLot "❓"
    Float withdrawalAmount 
    Float originalAmount 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "deposit_supply_withdrawals" {
    String id "🗝️"
    String accountId 
    String orderNumber "❓"
    DateTime withdrawalDate "❓"
    Float amount 
    DateTime createdAt 
    }
  

  "numerators" {
    String id "🗝️"
    NumeratorType numeratorType 
    Int lastNumerator 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "origin_destinations" {
    String id "🗝️"
    String name 
    Float lat "❓"
    Float lng "❓"
    Boolean isProcedure 
    Boolean isDestination 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "labor_services" {
    String id "🗝️"
    String service 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "purchase_orders" {
    String id "🗝️"
    String orderNumber "❓"
    String businessName "❓"
    String businessLogo "❓"
    String address "❓"
    String locality "❓"
    String zipCode "❓"
    String countryCode "❓"
    String contact "❓"
    String commercialTerms "❓"
    Float subtotal "❓"
    Float taxPercentage "❓"
    Float taxValue "❓"
    Float otherPercentage "❓"
    Float otherValue "❓"
    Float totalValue "❓"
    Boolean sent 
    DateTime creationDate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "purchase_order_items" {
    String id "🗝️"
    Float supplyAmount "❓"
    String unitMeasurement "❓"
    Float unitPrice "❓"
    DateTime createdAt 
    }
  

  "productive_units" {
    String id "🗝️"
    String units "❓"
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "productive_unit_fields" {
    String id "🗝️"
    String fieldName "❓"
    Float hectares "❓"
    DateTime createdAt 
    }
  

  "contract_sale_cereals" {
    String id "🗝️"
    String contractSaleNumber "❓"
    Float brokerPercentage "❓"
    Float brokerAmountValue "❓"
    Float commissionAgentPercentage "❓"
    Float commissionAgentAmountValue "❓"
    String condition "❓"
    String paymentMethod "❓"
    Boolean isOpenContract 
    DateTime dateCreated "❓"
    Float kg "❓"
    Float kms "❓"
    Float quintalQuote "❓"
    Float valueQuote "❓"
    Float usdQuote "❓"
    Float valueUsdQuote "❓"
    CurrencyCode currency "❓"
    Float amountValue "❓"
    Float kgDelivered "❓"
    Float valueCollected "❓"
    String contractType "❓"
    String status "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "contract_delivery_dates" {
    String id "🗝️"
    DateTime deliveryDate "❓"
    Float kg "❓"
    Float deliveredKg "❓"
    Boolean isCompleted 
    DateTime dateCreated "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "transport_documents" {
    String id "🗝️"
    String billNumber "❓"
    DateTime issueDate "❓"
    DateTime expirationDate "❓"
    String ctgNumber "❓"
    Float tariff "❓"
    String generatorTaxCode "❓"
    Float estimatedKg "❓"
    Float grossKg "❓"
    Float taraKg "❓"
    Float netKg "❓"
    String transporterTaxCode "❓"
    String transporterBusinessName "❓"
    String driverTaxCode "❓"
    Float kmToTravel "❓"
    String freightType "❓"
    Float referenceRate "❓"
    DateTime departureDate "❓"
    String contractSaleNumber "❓"
    String status "❓"
    String fileName "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "certificate_deposits" {
    String id "🗝️"
    String certificateFile "❓"
    String analysisNumber "❓"
    String grade "❓"
    Json electronicCertification "❓"
    Json depositary "❓"
    Json depositor "❓"
    Float grossWeight "❓"
    Float netWeight "❓"
    Float mermaVolatile "❓"
    Float mermaDrying "❓"
    Float mermaScreening "❓"
    Json services "❓"
    DateTime creationDate "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "certificate_deposit_transports" {
    String id "🗝️"
    String certificateNumber "❓"
    String billNumber "❓"
    DateTime billDate "❓"
    Float netKg "❓"
    Float mermaScreeningKg "❓"
    Float screeningRate "❓"
    Float screeningAmount "❓"
    Float humidityDrying "❓"
    Float mermaDryingKg "❓"
    Float dryingRate "❓"
    Float dryingAmount "❓"
    DateTime createdAt 
    }
  

  "campaign_expenses" {
    String id "🗝️"
    Float hectares "❓"
    String campaignName "❓"
    String zafra "❓"
    String fieldName "❓"
    String lotName "❓"
    String cropName "❓"
    String altCurrency "❓"
    Float altCurrencyRate "❓"
    Boolean isClosed 
    Json supplyLabors "❓"
    Json harvestLine "❓"
    Json serviceLabors "❓"
    Json machineryLabors "❓"
    Json expenseDetails "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  
    "crops" |o--|| "CropType" : "enum:cropType"
    "crops" |o--}o "Labor" : "enum:labors"
    "movement_types" |o--|| "StockSumType" : "enum:stockSum"
    "device_types" |o--|| "DeviceStatus" : "enum:status"
    "accounts" |o--|| "AccountCategory" : "enum:category"
    "accounts" |o--|| "CurrencyCode" : "enum:currency"
    "accounts" |o--|| "AccountStatus" : "enum:status"
    "licences" }o--|| "accounts" : "account"
    "licences" }o--|| "licence_types" : "licenceType"
    "licences" |o--|| "LicenceStatus" : "enum:status"
    "users" }o--|| "licences" : "licence"
    "users" |o--|| "UserState" : "enum:state"
    "users" |o--|o "UserRole" : "enum:role"
    "users" |o--|o "CurrencyCode" : "enum:currency"
    "companies" |o--|| "accounts" : "account"
    "contracts_corporate" |o--|| "accounts" : "account"
    "contracts_corporate" }o--|o "campaigns" : "campaign"
    "company_contracts" }o--|| "companies" : "company"
    "company_contracts" }o--|| "contracts_corporate" : "contract"
    "inputs" }o--|o "accounts" : "account"
    "inputs" }o--|o "countries" : "country"
    "inputs" |o--|o "inputs" : "replacement"
    "inputs" |o--}o "Labor" : "enum:labors"
    "inputs" }o--|o "input_types" : "inputType"
    "inputs" }o--|o "categories" : "category"
    "inputs" }o--|o "crops" : "crop"
    "input_crop_applications" }o--|| "inputs" : "input"
    "input_crop_applications" }o--|| "crops" : "crop"
    "zones" }o--|| "accounts" : "account"
    "zones" }o--|o "countries" : "country"
    "deposits" }o--|| "accounts" : "account"
    "deposit_locations" }o--|| "deposits" : "deposit"
    "fields" }o--|| "accounts" : "account"
    "fields" }o--|o "countries" : "country"
    "field_lots" }o--|| "fields" : "field"
    "campaigns" }o--|| "accounts" : "account"
    "campaigns" }o--|o "zones" : "zone"
    "campaigns" }o--|o "fields" : "field"
    "campaigns" |o--|| "CampaignState" : "enum:state"
    "campaigns" |o--|o "LotBranchMode" : "enum:lotBranchMode"
    "vehicles" }o--|| "accounts" : "account"
    "vehicles" }o--|o "vehicle_types" : "vehicleType"
    "vehicles" |o--|o "FuelType" : "enum:fuelType"
    "vehicle_maintenances" }o--|| "vehicles" : "vehicle"
    "vehicle_specifications" }o--|| "vehicles" : "vehicle"
    "social_entities" }o--|| "accounts" : "account"
    "social_entities" |o--|o "EntityType" : "enum:entityType"
    "stocks" }o--|| "accounts" : "account"
    "stocks" |o--|| "StockItemType" : "enum:itemType"
    "stocks" }o--|o "inputs" : "input"
    "stocks" }o--|o "crops" : "crop"
    "stocks" }o--|o "deposits" : "deposit"
    "stocks" }o--|o "campaigns" : "campaign"
    "stocks" }o--|o "fields" : "field"
    "stocks" }o--|o "field_lots" : "fieldLot"
    "stock_movements" }o--|| "accounts" : "account"
    "stock_movements" }o--|o "movement_types" : "movementType"
    "stock_movements" }o--|o "inputs" : "input"
    "stock_movements" }o--|o "crops" : "crop"
    "stock_movements" |o--|o "StockItemType" : "enum:itemType"
    "stock_movements" }o--|o "deposits" : "deposit"
    "stock_movements" }o--|o "campaigns" : "campaign"
    "stock_movements" |o--|o "CurrencyCode" : "enum:currency"
    "crop_movements" }o--|| "accounts" : "account"
    "crop_movements" }o--|o "deposits" : "deposit"
    "crop_movements" }o--|| "crops" : "crop"
    "crop_movements" }o--|o "campaigns" : "campaign"
    "crop_movements" }o--|o "fields" : "field"
    "crop_movements" }o--|o "field_lots" : "lot"
    "crop_movements" |o--|| "InOutDirection" : "enum:direction"
    "crop_deposits" }o--|| "accounts" : "account"
    "crop_deposits" }o--|o "campaigns" : "campaign"
    "crop_deposits" }o--|| "crops" : "crop"
    "crop_deposits" }o--|o "deposits" : "deposit"
    "crop_deposits" }o--|o "fields" : "field"
    "crop_deposits" }o--|o "field_lots" : "lot"
    "exit_fields" }o--|| "accounts" : "account"
    "exit_fields" }o--|o "campaigns" : "campaign"
    "exit_fields" }o--|o "fields" : "field"
    "exit_fields" }o--|o "field_lots" : "lot"
    "exit_fields" }o--|o "crops" : "crop"
    "exit_fields" }o--|o "deposits" : "deposit"
    "exit_fields" }o--|o "vehicles" : "vehicle"
    "exit_fields" }o--|o "vehicles" : "truckTrailer"
    "exit_fields" }o--|o "social_entities" : "transporter"
    "exit_fields" }o--|o "social_entities" : "trucker"
    "exit_fields" }o--|o "social_entities" : "harvester"
    "exit_fields" }o--|o "origin_destinations" : "destination"
    "withdrawal_orders" }o--|| "accounts" : "account"
    "withdrawal_orders" }o--|o "campaigns" : "campaign"
    "withdrawal_orders" }o--|o "social_entities" : "contractor"
    "withdrawal_orders" |o--|| "WithdrawalOrderType" : "enum:orderType"
    "withdrawal_orders" |o--|| "WithdrawalState" : "enum:state"
    "deposit_supply_orders" }o--|| "accounts" : "account"
    "deposit_supply_orders" }o--|o "withdrawal_orders" : "withdrawalOrder"
    "deposit_supply_orders" }o--|o "deposits" : "deposit"
    "deposit_supply_orders" }o--|o "inputs" : "input"
    "deposit_supply_withdrawals" }o--|| "deposit_supply_orders" : "depositSupplyOrder"
    "numerators" }o--|| "accounts" : "account"
    "numerators" |o--|| "NumeratorType" : "enum:numeratorType"
    "origin_destinations" }o--|| "accounts" : "account"
    "labor_services" }o--|| "accounts" : "account"
    "purchase_orders" }o--|| "accounts" : "account"
    "purchase_orders" }o--|o "social_entities" : "business"
    "purchase_order_items" }o--|| "purchase_orders" : "purchaseOrder"
    "purchase_order_items" }o--|o "inputs" : "input"
    "productive_units" }o--|| "accounts" : "account"
    "productive_unit_fields" }o--|| "productive_units" : "productiveUnit"
    "productive_unit_fields" }o--|o "fields" : "field"
    "productive_unit_fields" }o--|o "field_lots" : "lot"
    "contract_sale_cereals" }o--|| "accounts" : "account"
    "contract_sale_cereals" }o--|o "campaigns" : "campaign"
    "contract_sale_cereals" }o--|o "companies" : "company"
    "contract_sale_cereals" }o--|o "crops" : "crop"
    "contract_sale_cereals" }o--|o "social_entities" : "producer"
    "contract_sale_cereals" }o--|o "social_entities" : "buyer"
    "contract_sale_cereals" }o--|o "origin_destinations" : "destination"
    "contract_sale_cereals" }o--|o "social_entities" : "deliverer"
    "contract_sale_cereals" }o--|o "social_entities" : "broker"
    "contract_sale_cereals" }o--|o "social_entities" : "commissionAgent"
    "contract_sale_cereals" |o--|o "CurrencyCode" : "enum:currency"
    "contract_delivery_dates" }o--|| "contract_sale_cereals" : "contract"
    "transport_documents" }o--|| "accounts" : "account"
    "transport_documents" }o--|o "campaigns" : "campaign"
    "transport_documents" }o--|o "contract_sale_cereals" : "contract"
    "transport_documents" }o--|o "exit_fields" : "exitField"
    "transport_documents" }o--|o "vehicles" : "vehicleChasis"
    "transport_documents" }o--|o "vehicles" : "vehicleTrailer1"
    "transport_documents" }o--|o "vehicles" : "vehicleTrailer2"
    "certificate_deposits" }o--|| "accounts" : "account"
    "certificate_deposits" }o--|o "campaigns" : "campaign"
    "certificate_deposits" }o--|o "crops" : "crop"
    "certificate_deposit_transports" }o--|| "certificate_deposits" : "certificate"
    "certificate_deposit_transports" }o--|| "transport_documents" : "transportDocument"
    "campaign_expenses" }o--|| "accounts" : "account"
    "campaign_expenses" }o--|o "campaigns" : "campaign"
    "campaign_expenses" }o--|o "fields" : "field"
    "campaign_expenses" }o--|o "field_lots" : "lot"
    "campaign_expenses" }o--|o "crops" : "crop"
```
