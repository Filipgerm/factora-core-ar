from __future__ import annotations
from pydantic import BaseModel, Field, conint, constr, condecimal
from typing import Any, Optional, List, Literal
from datetime import datetime, date, time
from enum import Enum


class AddressType(BaseModel):
    street: Optional[constr(max_length=150)] = None
    number: Optional[str] = None
    postalCode: str  # Required per XSD
    city: constr(max_length=150)  # Required per XSD


class PartyType(BaseModel):
    vatNumber: constr(min_length=1, max_length=30)  # XSD maxLength=30
    country: constr(min_length=2, max_length=2)  # CountryType enum from XSD
    branch: int  # Required per XSD
    name: Optional[constr(max_length=200)] = None  # XSD maxLength=200
    address: Optional[AddressType] = None
    documentIdNo: Optional[constr(max_length=100)] = None
    supplyAccountNo: Optional[constr(max_length=100)] = None
    countryDocumentId: Optional[constr(min_length=2, max_length=2)] = None


# ===================== Payment Types =====================


class ProviderSignatureType(BaseModel):
    signingAuthor: constr(min_length=1, max_length=20)  # XSD maxLength=20
    signature: str  # Required per XSD


class ECRTokenType(BaseModel):
    signingAuthor: constr(
        min_length=1, max_length=15
    )  # XSD maxLength=15: ECR id: Registration number of the fiscal device
    sessionNumber: constr(
        min_length=6, max_length=6
    )  # XSD length=6: Unique 6-digit number that characterizes each transaction


Money = condecimal(ge=0, max_digits=18, decimal_places=2)  # Decimal with 2 places


class PaymentMethodDetailType(BaseModel):
    type: conint(ge=1, le=8)  # XSD: 1-8 (not 9)
    amount: Money
    paymentMethodInfo: Optional[str] = None
    tipAmount: Optional[Money] = None
    transactionId: Optional[str] = None
    tid: Optional[constr(max_length=200)] = None  # XSD maxLength=200: Κωδικός POS
    providersSignature: Optional[ProviderSignatureType] = (
        None  # Υπογραφή Πληρωμής Παρόχου
    )
    ecrToken: Optional[ECRTokenType] = (
        None  # Υπογραφή Πληρωμής ΦΗΜ με σύστημα λογισμικού (ERP)
    )


# ===================== Misc Object Types =====================


class EntityType(BaseModel):
    type: conint(ge=1, le=6)  # XSD: 1-6
    entityData: PartyType


class OtherDeliveryNoteHeaderType(BaseModel):
    loadingAddress: AddressType
    deliveryAddress: AddressType
    startShippingBranch: Optional[int] = None
    completeShippingBranch: Optional[int] = None


class ShipType(BaseModel):
    applicationId: str  # Required per XSD
    applicationDate: date  # Required per XSD
    doy: Optional[constr(max_length=150)] = None  # XSD maxLength=150
    shipId: str  # Required per XSD (note: XSD uses shipId, not shipID)


class TransportDetailType(BaseModel):
    vehicleNumber: constr(min_length=1, max_length=50)  # XSD maxLength=50


# ===================== Invoice Header =====================

# InvoiceType enum from XSD
InvoiceTypeEnum = Literal[
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "1.6",
    "2.1",
    "2.2",
    "2.3",
    "2.4",
    "3.1",
    "3.2",
    "4",
    "5.1",
    "5.2",
    "6.1",
    "6.2",
    "7.1",
    "8.1",
    "8.2",
    "8.4",
    "8.5",
    "8.6",
    "9.3",
    "11.1",
    "11.2",
    "11.3",
    "11.4",
    "11.5",
    "12",
    "13.1",
    "13.2",
    "13.3",
    "13.4",
    "13.30",
    "13.31",
    "14.1",
    "14.2",
    "14.3",
    "14.4",
    "14.5",
    "14.30",
    "14.31",
    "15.1",
    "16.1",
    "17.1",
    "17.2",
    "17.3",
    "17.4",
    "17.5",
    "17.6",
]


class InvoiceHeaderType(BaseModel):
    series: constr(min_length=1, max_length=50)  # XSD maxLength=50
    aa: constr(min_length=1, max_length=50)  # XSD maxLength=50
    issueDate: date  # Required per XSD
    invoiceType: InvoiceTypeEnum  # Required per XSD, enum from SimpleTypes

    currency: Optional[str] = None  # CurrencyType enum from XSD (3-letter codes)
    exchangeRate: Optional[
        condecimal(gt=0, le=50000, max_digits=18, decimal_places=5)
    ] = None  # XSD: fractionDigits=5, maxInclusive=50000

    vatPaymentSuspension: Optional[bool] = None
    selfPricing: Optional[bool] = None
    dispatchDate: Optional[date] = None
    dispatchTime: Optional[time] = None
    vehicleNumber: Optional[constr(max_length=150)] = None  # XSD maxLength=150 (not 50)

    movePurpose: Optional[conint(ge=1, le=20)] = None  # XSD: 1-20 (not ge=0)
    fuelInvoice: Optional[bool] = None
    specialInvoiceCategory: Optional[conint(ge=1, le=13)] = None  # XSD: 1-13 (not ge=0)
    invoiceVariationType: Optional[conint(ge=1, le=4)] = None  # XSD: 1-4 (not ge=0)

    correlatedInvoices: Optional[List[int]] = (
        None  # XSD: List[long] (not Optional[str])
    )
    otherCorrelatedEntities: Optional[List[EntityType]] = (
        None  # XSD: maxOccurs="unbounded"
    )
    otherDeliveryNoteHeader: Optional[OtherDeliveryNoteHeaderType] = None
    otherMovePurposeTitle: Optional[constr(max_length=150)] = None  # XSD maxLength=150
    thirdPartyCollection: Optional[bool] = None
    multipleConnectedMarks: Optional[List[int]] = (
        None  # XSD: List[long] (not Optional[str])
    )
    tableAA: Optional[constr(max_length=50)] = None  # XSD maxLength=50
    totalCancelDeliveryOrders: Optional[bool] = None
    reverseDeliveryNote: Optional[bool] = None
    reverseDeliveryNotePurpose: Optional[conint(ge=1, le=5)] = None  # XSD: 1-5


# ===================== Classifications =====================

# IncomeClassificationValueType enum from XSD
IncomeClassificationValueEnum = Literal[
    "E3_106",
    "E3_205",
    "E3_210",
    "E3_305",
    "E3_310",
    "E3_318",
    "E3_561_001",
    "E3_561_002",
    "E3_561_003",
    "E3_561_004",
    "E3_561_005",
    "E3_561_006",
    "E3_561_007",
    "E3_562",
    "E3_563",
    "E3_564",
    "E3_565",
    "E3_566",
    "E3_567",
    "E3_568",
    "E3_570",
    "E3_595",
    "E3_596",
    "E3_597",
    "E3_880_001",
    "E3_880_002",
    "E3_880_003",
    "E3_880_004",
    "E3_881_001",
    "E3_881_002",
    "E3_881_003",
    "E3_881_004",
    "E3_598_001",
    "E3_598_003",
]

# IncomeClassificationCategoryType enum from XSD
IncomeClassificationCategoryEnum = Literal[
    "category1_1",
    "category1_2",
    "category1_3",
    "category1_4",
    "category1_5",
    "category1_6",
    "category1_7",
    "category1_8",
    "category1_9",
    "category1_10",
    "category1_95",
    "category3",
]

# ExpensesClassificationValueType enum from XSD (extracted from SimpleTypes)
ExpensesClassificationValueEnum = Literal[
    "E3_101",
    "E3_102_001",
    "E3_102_002",
    "E3_102_003",
    "E3_102_004",
    "E3_102_005",
    "E3_102_006",
    "E3_104",
    "E3_201",
    "E3_202_001",
    "E3_202_002",
    "E3_202_003",
    "E3_202_004",
    "E3_202_005",
    "E3_204",
    "E3_207",
    "E3_209",
    "E3_301",
    "E3_302_001",
    "E3_302_002",
    "E3_302_003",
    "E3_302_004",
    "E3_302_005",
    "E3_304",
    "E3_307",
    "E3_309",
    "E3_312",
    "E3_313_001",
    "E3_313_002",
    "E3_313_003",
    "E3_313_004",
    "E3_313_005",
    "E3_315",
    "E3_581_001",
    "E3_581_002",
    "E3_581_003",
    "E3_582",
    "E3_583",
    "E3_584",
    "E3_585_001",
    "E3_585_002",
    "E3_585_003",
    "E3_585_004",
    "E3_585_005",
    "E3_585_006",
    "E3_585_007",
    "E3_585_008",
    "E3_585_009",
    "E3_585_010",
    "E3_585_011",
    "E3_585_012",
    "E3_585_013",
    "E3_585_014",
    "E3_585_015",
    "E3_585_016",
    "E3_586",
    "E3_587",
    "E3_588",
    "E3_589",
    "E3_881_001",
    "E3_881_002",
    "E3_881_003",
    "E3_881_004",
    "E3_882_001",
    "E3_882_002",
    "E3_882_003",
    "E3_882_004",
    "E3_883_001",
    "E3_883_002",
    "E3_883_003",
    "E3_883_004",
    "VAT_361",
    "VAT_362",
    "VAT_363",
    "VAT_364",
    "VAT_365",
    "VAT_366",
    "E3_103",
    "E3_203",
    "E3_303",
    "E3_208",
    "E3_308",
    "E3_314",
    "E3_106",
    "E3_205",
    "E3_305",
    "E3_210",
    "E3_310",
    "E3_318",
    "E3_598_002",
    "NOT_VAT_295",
]

# ExpensesClassificationCategoryType enum from XSD
ExpensesClassificationCategoryEnum = Literal[
    "category2_1",
    "category2_2",
    "category2_3",
    "category2_4",
    "category2_5",
    "category2_6",
    "category2_7",
    "category2_8",
    "category2_9",
    "category2_10",
    "category2_11",
    "category2_12",
    "category2_13",
    "category2_14",
    "category2_95",
]


class IncomeClassificationType(BaseModel):
    classificationType: Optional[IncomeClassificationValueEnum] = (
        None  # XSD: minOccurs=0
    )
    classificationCategory: IncomeClassificationCategoryEnum  # Required per XSD
    amount: Money  # Required per XSD
    id: Optional[int] = None  # XSD: type=byte, minOccurs=0


class ExpensesClassificationType(BaseModel):
    classificationType: Optional[ExpensesClassificationValueEnum] = (
        None  # XSD: minOccurs=0
    )
    classificationCategory: Optional[ExpensesClassificationCategoryEnum] = (
        None  # XSD: minOccurs=0
    )
    amount: Money  # Required per XSD
    vatAmount: Optional[Money] = None  # XSD: minOccurs=0
    vatCategory: Optional[conint(ge=1, le=10)] = None  # XSD: VatType 1-10, minOccurs=0
    vatExemptionCategory: Optional[conint(ge=1, le=31)] = (
        None  # XSD: VatExemptionType 1-31, minOccurs=0
    )
    id: Optional[int] = None  # XSD: type=byte, minOccurs=0


class InvoiceSummaryType(BaseModel):
    totalNetValue: Money
    totalVatAmount: Money
    totalWithheldAmount: Money  # Σύνολο Παρακρατήσεων Φόρων
    totalFeesAmount: Money  # Σύνολο Τελών
    totalStampDutyAmount: Money  # Σύνολο Ψηφιακού Τέλους συναλλαγής
    totalOtherTaxesAmount: Money
    totalDeductionsAmount: Money
    totalGrossValue: Money
    incomeClassification: Optional[List[IncomeClassificationType]] = (
        None  # Χαρακτηρισμοί Εσόδων
    )
    expensesClassification: Optional[List[ExpensesClassificationType]] = (
        None  # Χαρακτηρισμοί Εξόδων
    )


class InvoiceRowType(BaseModel):
    lineNumber: conint(ge=1)  # Required per XSD

    recType: Optional[conint(ge=1, le=7)] = None  # XSD: 1-7

    fuelCode: Optional[str] = (
        None  # FuelCodes enum from XSD (string values like "10", "11", etc.)
    )
    taricNo: Optional[constr(max_length=10)] = None  # XSD length=10

    itemCode: Optional[constr(max_length=50)] = None  # XSD maxLength=50
    itemDescr: Optional[constr(max_length=300)] = None  # XSD maxLength=300

    quantity: Optional[condecimal(gt=0, max_digits=18, decimal_places=2)] = (
        None  # XSD: minExclusive=0
    )
    measurementUnit: Optional[conint(ge=1, le=7)] = None  # XSD QuantityType: 1-7

    invoiceDetailType: Optional[conint(ge=1, le=2)] = None  # XSD InvoiceDetailType: 1-2

    netValue: Money  # Required per XSD

    vatCategory: conint(ge=1, le=10)  # Required per XSD, VatType: 1-10
    vatAmount: Money  # Required per XSD
    vatExemptionCategory: Optional[conint(ge=1, le=31)] = (
        None  # XSD VatExemptionType: 1-31
    )

    dienergia: Optional[ShipType] = None
    discountOption: Optional[bool] = None
    withheldAmount: Optional[Money] = None
    withheldPercentCategory: Optional[conint(ge=1, le=18)] = (
        None  # XSD WithheldType: 1-18
    )

    stampDutyAmount: Optional[Money] = None
    stampDutyPercentCategory: Optional[conint(ge=1, le=4)] = (
        None  # XSD StampDutyType: 1-4
    )

    feesAmount: Optional[Money] = None
    feesPercentCategory: Optional[conint(ge=1, le=22)] = None  # XSD FeesType: 1-22

    otherTaxesPercentCategory: Optional[conint(ge=1, le=30)] = (
        None  # XSD OtherTaxesType: 1-30
    )
    otherTaxesAmount: Optional[Money] = None
    deductionsAmount: Optional[Money] = None

    lineComments: Optional[constr(max_length=150)] = None  # XSD maxLength=156
    incomeClassification: Optional[List["IncomeClassificationType"]] = (
        None  # XSD: maxOccurs="unbounded"
    )
    expensesClassification: Optional[List["ExpensesClassificationType"]] = (
        None  # XSD: maxOccurs="unbounded"
    )

    quantity15: Optional[condecimal(gt=0, max_digits=18, decimal_places=2)] = (
        None  # XSD: minExclusive=0
    )
    otherMeasurementUnitQuantity: Optional[int] = None
    otherMeasurementUnitTitle: Optional[constr(max_length=150)] = (
        None  # XSD maxLength=150
    )
    notVAT195: Optional[bool] = None


# ===================== Tax Totals =====================


class TaxesTotalsType(BaseModel):
    taxType: conint(ge=1, le=5)
    taxCategory: Optional[conint(ge=1)] = None
    underlyingValue: Optional[Money] = None
    taxAmount: Money
    id: Optional[int] = None


class TaxesType(BaseModel):
    # In the XML this is usually a collection; model as a list of lines.
    taxes: List[TaxesTotalsType] = Field(default_factory=list)


# ===================== Invoice Container =====================


class AadeBookInvoiceType(BaseModel):
    uid: Optional[str] = None  # XSD: minOccurs=0
    mark: Optional[int] = None  # XSD: type=long, minOccurs=0
    cancelledByMark: Optional[int] = (
        None  # XSD: type=long, minOccurs=0 (not Optional[str])
    )
    authenticationCode: Optional[str] = None  # XSD: minOccurs=0
    transmissionFailure: Optional[conint(ge=1, le=4)] = (
        None  # XSD: type=byte, 1-4, minOccurs=0
    )

    # Full invoice structure - align with spec structure (nested types instead of dicts)
    issuer: Optional[PartyType] = None  # XSD: minOccurs=0
    counterpart: Optional[PartyType] = None  # XSD: minOccurs=0
    invoiceHeader: Optional["InvoiceHeaderType"] = (
        None  # XSD: required, but we allow Optional for flexibility
    )

    # Payments: XSD shows paymentMethods contains paymentMethodDetails (list)
    paymentMethods: Optional[List[PaymentMethodDetailType]] = (
        None  # XSD: minOccurs=0, contains paymentMethodDetails maxOccurs="unbounded"
    )

    invoiceDetails: Optional[List[InvoiceRowType]] = None  # XSD: maxOccurs="unbounded"
    taxesTotals: Optional[TaxesType] = (
        None  # XSD: minOccurs=0, contains taxes maxOccurs="unbounded"
    )
    invoiceSummary: Optional["InvoiceSummaryType"] = (
        None  # XSD: required, but we allow Optional for flexibility
    )
    qrCodeUrl: Optional[str] = None  # XSD: minOccurs=0
    otherTransportDetails: Optional[List[TransportDetailType]] = (
        None  # XSD: minOccurs=0, maxOccurs="unbounded"
    )
    downloadingInvoiceUrl: Optional[str] = None  # XSD: minOccurs=0


# SendInvoices wrapper
class InvoicesDoc(BaseModel):
    invoices: List[AadeBookInvoiceType] = Field(default_factory=list)


class CancelledInvoiceType(BaseModel):
    invoiceMark: int
    cancellationMark: int
    cancellationDate: datetime
