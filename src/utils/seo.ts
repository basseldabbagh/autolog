import { getActiveProfileKey, getAppData } from "../state/store";
import { formatNumber } from "./format";

export function updateDynamicSEO(): void {
  const appData = getAppData();
  const activeProfileKey = getActiveProfileKey();
  if (!appData || !appData.vehicle) return;

  const v = appData.vehicle;
  const isBlank = activeProfileKey === "blank-template" || v.make === "Car Make";

  const setMeta = (id: string, val: string): void => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("content", val);
  };
  const setHref = (id: string, val: string): void => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("href", val);
  };

  let canonicalUrl = "./";
  try {
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      canonicalUrl = window.location.origin + window.location.pathname;
    }
  } catch {
    // ignore
  }
  setHref("canonicalLink", canonicalUrl);
  setMeta("ogUrl", canonicalUrl);

  const webAppDefinition = {
    "@type": "WebApplication",
    name: "My MotoFolio",
    url: "https://motofolio.pages.dev/",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "All",
    browserRequirements: "Requires modern web browser with HTML5 and ES6 support",
    description:
      "Universal interactive car maintenance tracker, periodic service interval calculator, live odometer simulator, and printable A4 vehicle condition report.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Periodic service interval calculations",
      "Dynamic odometer simulation",
      "Workshop maintenance expense ledger",
      "Printable A4 vehicle condition reports",
      "Google Drive cloud backup and sync",
      "Offline Progressive Web App (PWA) support",
    ],
  };

  if (isBlank) {
    const defaultTitle = "My MotoFolio — Universal Car Maintenance & Service Tracker";
    const defaultDesc =
      "Universal interactive car maintenance tracker, periodic service interval calculator, live odometer simulator, and printable A4 vehicle condition report.";
    document.title = defaultTitle;
    setMeta("seoDesc", defaultDesc);
    setMeta(
      "seoKeywords",
      "My MotoFolio, car maintenance tracker, periodic service schedule, odometer calculator, vehicle condition report, workshop log",
    );
    setMeta("ogTitle", "My MotoFolio — Car Maintenance & Service Tracker");
    setMeta("ogDesc", defaultDesc);
    setMeta("ogImageAlt", "My MotoFolio — Universal Car Maintenance & Service Tracker");
    setMeta("twTitle", "My MotoFolio — Car Maintenance & Service Tracker");
    setMeta("twDesc", defaultDesc);
    setMeta("twImageAlt", "My MotoFolio — Universal Car Maintenance & Service Tracker");

    const schemaEl = document.getElementById("jsonLdSchema");
    if (schemaEl) {
      schemaEl.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [webAppDefinition],
      });
    }
    return;
  }

  const curKm = formatNumber(v.currentMileageKm || 0);
  const carName = `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim();
  const plate = v.plateNumber ? ` (${v.plateNumber})` : "";
  const titleText = `${carName}${plate} — My MotoFolio Maintenance Tracker (${curKm} km)`;
  const descText = `${carName}${plate} at ${curKm} km • Updated ${appData.lastUpdated || "today"}. Periodic service schedule, next due mileage, and workshop cost history.`;
  const keywordsText = `car maintenance tracker, service schedule, odometer tracker, workshop log, ${v.make || ""}, ${v.model || ""}, ${v.plateNumber || ""}`;

  document.title = titleText;
  setMeta("seoDesc", descText);
  setMeta("seoKeywords", keywordsText);
  setMeta("ogTitle", titleText);
  setMeta("ogDesc", descText);
  setMeta("ogImageAlt", `${carName} maintenance status and periodic service schedule on My MotoFolio`);
  setMeta("twTitle", titleText);
  setMeta("twDesc", descText);
  setMeta("twImageAlt", `${carName} maintenance status and periodic service schedule on My MotoFolio`);

  const schemaEl = document.getElementById("jsonLdSchema");
  if (schemaEl) {
    schemaEl.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        webAppDefinition,
        {
          "@type": "Car",
          name: carName,
          brand: {
            "@type": "Brand",
            name: v.make || "",
          },
          model: v.model || "",
          vehicleModelDate: String(v.year || ""),
          vehicleIdentificationNumber: v.chassisNumber || "",
          vehicleEngine: { "@type": "EngineSpecification", name: v.engine || "" },
          vehicleTransmission: v.transmission || "",
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: Number(v.currentMileageKm) || 0,
            unitCode: "KMT",
          },
        },
      ],
    });
  }
}
