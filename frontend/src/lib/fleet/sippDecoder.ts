/**
 * SIPP (Standard Interline Passenger Car Identifier) Code Decoder
 * Compliant with the ACRISS Car Classification Standard.
 *
 * Automatically infers:
 * - Category (Mini, Economy, Compact, Intermediate, Standard, Fullsize, Premium, Luxury, Van)
 * - Number of Doors
 * - Number of Seats
 * - Transmission (Automatic / Manual)
 * - Fuel Type (Petrol, Diesel, Hybrid, Electric)
 * - Air Conditioning (Yes / No)
 * - Luggage Capacity (e.g. "1 Large Bag", "2 Bags", "3 Bags")
 */

export interface DecodedSippSpecs {
  category: "compact" | "economy" | "sedan" | "suv" | "luxury" | "van" | "commercial";
  seats: number;
  doors: number;
  airConditioning: boolean;
  fuelType: "petrol" | "diesel" | "hybrid" | "electric";
  luggageCapacity: string;
  transmission: "automatic" | "manual";
  summaryEn: string;
  summaryAr: string;
}

export function decodeSipp(rawCode?: string | null): DecodedSippSpecs {
  const code = (rawCode || "ICAR").trim().toUpperCase();
  const c1 = code[0] || "I";
  const c2 = code[1] || "C";
  const c3 = code[2] || "A";
  const c4 = code[3] || "R";

  // 1. Category & Base Seats / Bags
  let category: DecodedSippSpecs["category"] = "compact";
  let seats = 5;
  let luggageCapacity = "2 Large Bags";

  switch (c1) {
    case "M": // Mini
      category = "compact";
      seats = 4;
      luggageCapacity = "1 Small Bag";
      break;
    case "E": // Economy
      category = "economy";
      seats = 5;
      luggageCapacity = "1-2 Bags";
      break;
    case "C": // Compact
      category = "compact";
      seats = 5;
      luggageCapacity = "2 Bags";
      break;
    case "I": // Intermediate
      category = "sedan";
      seats = 5;
      luggageCapacity = "2-3 Large Bags";
      break;
    case "S": // Standard
      category = "sedan";
      seats = 5;
      luggageCapacity = "3 Large Bags";
      break;
    case "F": // Fullsize
      category = "sedan";
      seats = 5;
      luggageCapacity = "3-4 Large Bags";
      break;
    case "P": // Premium
      category = "luxury";
      seats = 5;
      luggageCapacity = "3 Large Bags";
      break;
    case "L": // Luxury
    case "W":
      category = "luxury";
      seats = 5;
      luggageCapacity = "3-4 Large Bags";
      break;
    case "V": // Passenger Van
      category = "van";
      seats = 7;
      luggageCapacity = "4-5 Large Bags";
      break;
    case "X": // Special
      category = "suv";
      seats = 5;
      luggageCapacity = "3 Large Bags";
      break;
    default:
      category = "sedan";
      seats = 5;
      luggageCapacity = "2 Bags";
  }

  // 2. Body Type & Doors
  let doors = 4;
  if (c2 === "B" || c2 === "C") {
    doors = 2;
  } else if (c2 === "D" || c2 === "W") {
    doors = 4;
  } else if (c2 === "F" || c2 === "G") {
    category = "suv";
    doors = 5;
  } else if (c2 === "V") {
    category = "van";
    doors = 5;
    seats = Math.max(seats, 7);
  }

  // 3. Transmission
  let transmission: "automatic" | "manual" = "automatic";
  if (c3 === "M" || c3 === "N" || c3 === "C") {
    transmission = "manual";
  } else {
    transmission = "automatic";
  }

  // 4. Fuel & Air Conditioning
  let airConditioning = true;
  let fuelType: "petrol" | "diesel" | "hybrid" | "electric" = "petrol";

  if (c4 === "N" || c4 === "Q" || c4 === "C" || c4 === "Z") {
    airConditioning = false;
  }

  if (c4 === "D" || c4 === "Q") {
    fuelType = "diesel";
  } else if (c4 === "H" || c4 === "I") {
    fuelType = "hybrid";
  } else if (c4 === "E" || c4 === "C") {
    fuelType = "electric";
  } else {
    fuelType = "petrol";
  }

  const transAr = transmission === "automatic" ? "أوتوماتيك" : "يدوي";
  const fuelAr =
    fuelType === "petrol"
      ? "بنزين"
      : fuelType === "diesel"
      ? "ديزل"
      : fuelType === "hybrid"
      ? "هايبرد"
      : "كهرباء";
  const acAr = airConditioning ? "مكيف" : "بدون تكييف";

  return {
    category,
    seats,
    doors,
    airConditioning,
    fuelType,
    luggageCapacity,
    transmission,
    summaryEn: `${seats} Seats, ${doors} Doors, ${transmission}, ${fuelType}, A/C: ${airConditioning ? "Yes" : "No"}`,
    summaryAr: `${seats} مقاعد، ${doors} أبواب، ${transAr}، ${fuelAr}، ${acAr}`,
  };
}
