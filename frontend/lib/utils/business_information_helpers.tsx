// Generate realistic email address from business name
export const generateEmail = (businessName: string): string => {
    // Common legal entity suffixes to remove (case insensitive)
    // Only remove legal suffixes, not business type words like "Solutions", "Consulting", etc.
    const legalSuffixes = [
        /\s+S\.A\.$/i,
        /\s+Ltd\.?$/i,
        /\s+LLC\.?$/i,
        /\s+GmbH$/i,
        /\s+Inc\.?$/i,
        /\s+Corp\.?$/i,
        /\s+LLP\.?$/i,
        /\s+PLC\.?$/i,
        /\s+P\.C\.$/i,
        /\s+Co\.?$/i,
    ];

    let cleaned = businessName;

    // Remove legal entity suffixes only
    for (const suffix of legalSuffixes) {
        cleaned = cleaned.replace(suffix, "");
    }

    // Convert to lowercase
    cleaned = cleaned.toLowerCase();

    // Remove all special characters and punctuation (keep only alphanumeric and spaces)
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, "");

    // Remove extra spaces and trim
    cleaned = cleaned.replace(/\s+/g, "").trim();

    // Generate email
    return `contact@${cleaned}.com`;
};


// Country information interface
interface CountryInfo {
    countryCode: string;
    dialingCode: string;
}

// Map VAT number prefixes to country codes and dialing codes
const VAT_COUNTRY_MAP: Record<string, CountryInfo> = {
    GB: { countryCode: "GB", dialingCode: "+44" }, // United Kingdom
    DE: { countryCode: "DE", dialingCode: "+49" }, // Germany
    PL: { countryCode: "PL", dialingCode: "+48" }, // Poland
    ES: { countryCode: "ES", dialingCode: "+34" }, // Spain
    EL: { countryCode: "EL", dialingCode: "+30" }, // Greece
    FR: { countryCode: "FR", dialingCode: "+33" }, // France
    IT: { countryCode: "IT", dialingCode: "+39" }, // Italy
    NL: { countryCode: "NL", dialingCode: "+31" }, // Netherlands
    BE: { countryCode: "BE", dialingCode: "+32" }, // Belgium
    AT: { countryCode: "AT", dialingCode: "+43" }, // Austria
    SE: { countryCode: "SE", dialingCode: "+46" }, // Sweden
    NO: { countryCode: "NO", dialingCode: "+47" }, // Norway
    DK: { countryCode: "DK", dialingCode: "+45" }, // Denmark
    FI: { countryCode: "FI", dialingCode: "+358" }, // Finland
    CZ: { countryCode: "CZ", dialingCode: "+420" }, // Czech Republic
    HU: { countryCode: "HU", dialingCode: "+36" }, // Hungary
    RO: { countryCode: "RO", dialingCode: "+40" }, // Romania
    BG: { countryCode: "BG", dialingCode: "+359" }, // Bulgaria
    IE: { countryCode: "IE", dialingCode: "+353" }, // Ireland
    PT: { countryCode: "PT", dialingCode: "+351" }, // Portugal
    RU: { countryCode: "RU", dialingCode: "+7" }, // Russia
};

// Get country information from VAT number
const getCountryFromVat = (vatNumber: string): CountryInfo => {
    // Extract country code prefix (first 2 characters)
    const prefix = vatNumber.substring(0, 2).toUpperCase();
    return VAT_COUNTRY_MAP[prefix] || { countryCode: "GB", dialingCode: "+44" }; // Default to UK
};

// Generate country-specific phone number
export const generatePhoneNumber = (vatNumber: string, customerId: number): string => {
    const countryInfo = getCountryFromVat(vatNumber);
    const dialingCode = countryInfo.dialingCode;

    // Extract numeric part from VAT number for deterministic generation
    const vatNumeric =
        parseInt(vatNumber.replace(/\D/g, "").slice(-8), 10) || customerId;
    const seed = (vatNumeric + customerId) % 10000000;

    // Format phone number based on country
    switch (countryInfo.countryCode) {
        case "GB": // United Kingdom: +44 20 XXXX XXXX or +44 1XXX XXX XXX
            if (seed % 2 === 0) {
                // London format: +44 20 XXXX XXXX
                const number = (7000000 + (seed % 3000000)).toString().padStart(8, "0");
                return `${dialingCode} 20 ${number.substring(0, 4)} ${number.substring(
                    4
                )}`;
            } else {
                // National format: +44 1XXX XXX XXX
                const area = "1" + (200 + (seed % 800)).toString().padStart(3, "0");
                const number = (seed % 1000000).toString().padStart(6, "0");
                return `${dialingCode} ${area} ${number.substring(
                    0,
                    3
                )} ${number.substring(3)}`;
            }

        case "DE": // Germany: +49 30 XXXX XXXX or +49 XXX XXXX XXXX
            if (seed % 2 === 0) {
                // Berlin format: +49 30 XXXX XXXX
                const number = (seed % 10000000).toString().padStart(8, "0");
                return `${dialingCode} 30 ${number.substring(0, 4)} ${number.substring(
                    4
                )}`;
            } else {
                // National format: +49 XXX XXXX XXXX
                const area = (200 + (seed % 800)).toString().padStart(3, "0");
                const number = (seed % 10000000).toString().padStart(8, "0");
                return `${dialingCode} ${area} ${number.substring(
                    0,
                    4
                )} ${number.substring(4)}`;
            }

        case "PL": // Poland: +48 XX XXX XX XX
            const areaCode = (10 + (seed % 90)).toString().padStart(2, "0");
            const number = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${areaCode} ${number.substring(
                0,
                3
            )} ${number.substring(3, 5)} ${number.substring(5)}`;

        case "ES": // Spain: +34 XXX XXX XXX
            const area = (600 + (seed % 400)).toString().padStart(3, "0");
            const number2 = (seed % 1000000).toString().padStart(6, "0");
            return `${dialingCode} ${area} ${number2.substring(
                0,
                3
            )} ${number2.substring(3)}`;

        case "EL": // Greece: +30 21X XXX XXXX or +30 2XX XXX XXXX
            if (seed % 2 === 0) {
                // Athens format: +30 21X XXX XXXX
                const area = "21" + (seed % 10).toString();
                const number = (seed % 1000000).toString().padStart(7, "0");
                return `${dialingCode} ${area} ${number.substring(
                    0,
                    3
                )} ${number.substring(3)}`;
            } else {
                // National format: +30 2XX XXX XXXX
                const area2 = "2" + (10 + (seed % 90)).toString().padStart(2, "0");
                const number = (seed % 1000000).toString().padStart(7, "0");
                return `${dialingCode} ${area2} ${number.substring(
                    0,
                    3
                )} ${number.substring(3)}`;
            }

        case "FR": // France: +33 X XX XX XX XX
            const area3 = (1 + (seed % 9)).toString();
            const number3 = (seed % 100000000).toString().padStart(9, "0");
            return `${dialingCode} ${area3} ${number3.substring(
                0,
                2
            )} ${number3.substring(2, 4)} ${number3.substring(
                4,
                6
            )} ${number3.substring(6, 8)} ${number3.substring(8)}`;

        case "IT": // Italy: +39 0X XXXX XXXX
            const area4 = "0" + (1 + (seed % 9)).toString();
            const number4 = (seed % 10000000).toString().padStart(9, "0");
            return `${dialingCode} ${area4} ${number4.substring(
                0,
                4
            )} ${number4.substring(4)}`;

        case "NL": // Netherlands: +31 XX XXX XXXX
            const area5 = (10 + (seed % 90)).toString().padStart(2, "0");
            const number5 = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${area5} ${number5.substring(
                0,
                3
            )} ${number5.substring(3)}`;

        case "BE": // Belgium: +32 X XXX XX XX
            const area6 = (1 + (seed % 9)).toString();
            const number6 = (seed % 10000000).toString().padStart(8, "0");
            return `${dialingCode} ${area6} ${number6.substring(
                0,
                3
            )} ${number6.substring(3, 5)} ${number6.substring(5)}`;

        case "AT": // Austria: +43 X XXXX XXXX
            const area7 = (1 + (seed % 9)).toString();
            const number7 = (seed % 10000000).toString().padStart(8, "0");
            return `${dialingCode} ${area7} ${number7.substring(
                0,
                4
            )} ${number7.substring(4)}`;

        case "SE": // Sweden: +46 XX XXX XX XX
            const area8 = (10 + (seed % 90)).toString().padStart(2, "0");
            const number8 = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${area8} ${number8.substring(
                0,
                3
            )} ${number8.substring(3, 5)} ${number8.substring(5)}`;

        case "NO": // Norway: +47 XX XX XX XX
            const number9 = (seed % 100000000).toString().padStart(8, "0");
            return `${dialingCode} ${number9.substring(0, 2)} ${number9.substring(
                2,
                4
            )} ${number9.substring(4, 6)} ${number9.substring(6)}`;

        case "DK": // Denmark: +45 XX XX XX XX
            const number10 = (seed % 100000000).toString().padStart(8, "0");
            return `${dialingCode} ${number10.substring(0, 2)} ${number10.substring(
                2,
                4
            )} ${number10.substring(4, 6)} ${number10.substring(6)}`;

        case "FI": // Finland: +358 XX XXX XXXX
            const area9 = (10 + (seed % 90)).toString().padStart(2, "0");
            const number11 = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${area9} ${number11.substring(
                0,
                3
            )} ${number11.substring(3)}`;

        case "CZ": // Czech Republic: +420 XXX XXX XXX
            const number12 = (seed % 1000000000).toString().padStart(9, "0");
            return `${dialingCode} ${number12.substring(0, 3)} ${number12.substring(
                3,
                6
            )} ${number12.substring(6)}`;

        case "HU": // Hungary: +36 XX XXX XXXX
            const area10 = (1 + (seed % 99)).toString().padStart(2, "0");
            const number13 = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${area10} ${number13.substring(
                0,
                3
            )} ${number13.substring(3)}`;

        case "RO": // Romania: +40 XX XXX XXXX
            const area11 = (10 + (seed % 90)).toString().padStart(2, "0");
            const number14 = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${area11} ${number14.substring(
                0,
                3
            )} ${number14.substring(3)}`;

        case "BG": // Bulgaria: +359 XX XXX XXX
            const area12 = (10 + (seed % 90)).toString().padStart(2, "0");
            const number15 = (seed % 1000000).toString().padStart(6, "0");
            return `${dialingCode} ${area12} ${number15.substring(
                0,
                3
            )} ${number15.substring(3)}`;

        case "IE": // Ireland: +353 XX XXX XXXX
            const area13 = (1 + (seed % 99)).toString().padStart(2, "0");
            const number16 = (seed % 1000000).toString().padStart(7, "0");
            return `${dialingCode} ${area13} ${number16.substring(
                0,
                3
            )} ${number16.substring(3)}`;

        case "PT": // Portugal: +351 XXX XXX XXX
            const number17 = (seed % 1000000000).toString().padStart(9, "0");
            return `${dialingCode} ${number17.substring(0, 3)} ${number17.substring(
                3,
                6
            )} ${number17.substring(6)}`;

        case "RU": // Russia: +7 XXX XXX XX XX
            const area14 = (900 + (seed % 100)).toString().padStart(3, "0");
            const number18 = (seed % 100000000).toString().padStart(7, "0");
            return `${dialingCode} ${area14} ${number18.substring(
                0,
                3
            )} ${number18.substring(3, 5)} ${number18.substring(5)}`;

        default:
            // Default format: +44 20 XXXX XXXX
            const defaultNumber = (seed % 10000000).toString().padStart(8, "0");
            return `${dialingCode} 20 ${defaultNumber.substring(
                0,
                4
            )} ${defaultNumber.substring(4)}`;
    }
};