import banksData from "./banks.json";
import insuranceCompaniesData from "./insurance-companies.json";

export interface Partner {
  id: string;
  name: string;
  logo: string;
}

const buildLogoMap = (partners: Partner[]): Record<string, string> =>
  partners.reduce<Record<string, string>>((acc, partner) => {
    acc[partner.name] = partner.logo;
    return acc;
  }, {});

export const banks: Partner[] = banksData;
export const insuranceCompanies: Partner[] = insuranceCompaniesData;

export const bankLogoMap = buildLogoMap(banks);
export const insuranceLogoMap = buildLogoMap(insuranceCompanies);

export const defaultBankLogo = "/images/banks/default-bank.png";
export const defaultInsuranceLogo = "/images/insurance/default-insurance.png";
