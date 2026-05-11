import validateVin from "./validateVin";

// Last updated for version 4.04 of the NHTSA Vehicle API

/**
 * VehicleApi provides methods to interact with the NHTSA Vehicle API for fetching makes, models, and decoding VINs.
 * It includes caching for makes to optimize performance and validation for VIN inputs.
 * Each method returns a Promise that resolves with the API response or rejects with an error if the input is invalid.
 */
const baseUrl = "https://vpic.nhtsa.dot.gov/api/vehicles/";

export type VehicleApiResponse<T> = Promise<{
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: T[];
}>;

export type MakeResponse = {
  MakeId: number;
  MakeName: string;
  VehicleTypeId: number;
  VehicleTypeName: string;
};

export type ModelResponse = {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
};

export type DecodedVinResponse = {
  Value: string;
  ValueId: string;
  Variable: string;
  VariableId: number;
};

/**
 * 
 * @param param0 vehicleType - defaults to car, but can use any valid vehicle type from NHTSA options
 * @returns Object with format like:
 * {
    "Count": 193,
    "Message": "Response returned successfully",
    "SearchCriteria": "Vehicle Type: car",
    "Results": [
        {
            "MakeId": 440,
            "MakeName": "ASTON MARTIN",
            "VehicleTypeId": 2,
            "VehicleTypeName": "Passenger Car"
        },
        ...],};
 */
const getMakes = async ({
  vehicleType,
}: {
  vehicleType?: string;
}): VehicleApiResponse<MakeResponse> =>
  fetch(
    baseUrl + `GetMakesForVehicleType/${vehicleType || "car"}?format=json`,
  ).then((r) => r.json());

/**
 * 
 * @param param0 make - A valid vehicle make
 * @returns Object with formatting like: 
 * {
  "Count": 464,
  "Message": "Response returned successfully",
  "SearchCriteria": "Make:honda",
  "Results": [
    {
      "Make_ID": 474,
      "Make_Name": "Honda",
      "Model_ID": 1861,
      "Model_Name": "Accord"
    },...]};
 */
const getModelsForMake = async ({
  make,
}: {
  make: string;
}): VehicleApiResponse<ModelResponse> => {
  const url = `${baseUrl}GetModelsForMake/${make}?format=json`;
  return fetch(url).then((r) => r.json());
};

/**
 * 
 * @param param0 makeId - A valid vehicle makeId
 * @returns Object with formatting like: 
 * {
  "Count": 18,
  "Message": "Response returned successfully",
  "SearchCriteria": "MakeId:440",
  "Results": [
    {
      "Make_ID": 440,
      "Make_Name": "Aston Martin",
      "Model_ID": 1684,
      "Model_Name": "V8 Vantage"
    },...]};
 */
const getModelsForMakeId = async ({
  makeId,
}: {
  makeId: number;
}): VehicleApiResponse<ModelResponse> =>
  fetch(`${baseUrl}GetModelsForMakeId/${makeId}?format=json`).then((r) =>
    r.json(),
  );

/**
 * 
 * @param param0 makeId - A valid vehicle makeId
 * @param param0 year - A valid vehicle model year (e.g. 2020)
 * @returns Object with formatting like: 
 * {
  "Count": 464,
  "Message": "Response returned successfully",
  "SearchCriteria": "Make:honda",
  "Results": [
    {
      "Make_ID": 474,
      "Make_Name": "Honda",
      "Model_ID": 1861,
      "Model_Name": "Accord"
    },...]};
 */
const getModelsForMakeIdYear = async ({
  makeId,
  year,
}: {
  makeId: number;
  year: number;
}): VehicleApiResponse<ModelResponse> =>
  fetch(
    `${baseUrl}GetModelsForMakeIdYear/makeId/${makeId}/modelyear/${year}?format=json`,
  ).then((r) => r.json());

/**
 *
 * @param param0 make - Valid make, year - valid year
 * @returns Object with formatting like:
 * {
 * "Count": 84,
 * "Message": "Results returned successfully",
 * "SearchCriteria": "Make:honda | ModelYear:2015",
 * "Results": [
 * {
 *  "Make_ID": 474,
 * "Make_Name": "HONDA",
 * "Model_ID": 1861,
 * "Model_Name": "Accord"
 * },...]};
 */
const getModelsForMakeYear = async ({
  make,
  year,
}: {
  make: string;
  year: number;
}): VehicleApiResponse<ModelResponse> =>
  fetch(
    `${baseUrl}GetModelsForMakeYear/make/${make}/modelYear/${year}?format=json`,
  ).then((r) => r.json());

/**
 *
 * @param param0 make - vehicle manufacturer make, year - model year of vehicle, makeId - optional makeId for vehicle make
 * @returns
 * Object with formatting like:
 * {
 * "Count": 84,
 * "Message": "Results returned successfully",
 * "SearchCriteria": "Make:honda | ModelYear:2015",
 * "Results": [
 * {
 * "Make_ID": 474,
 * "Make_Name": "HONDA",
 * "Model_ID": 1861,
 * "Model_Name": "Accord"
 * },...]};
 *
 */
const getModels = async ({
  make,
  year,
  makeId,
}: {
  make?: string;
  year?: number;
  makeId?: number;
}): VehicleApiResponse<ModelResponse> => {
  if (!makeId && !make && !year) {
    return Promise.reject(
      new Error("Must provide at least one of make, year, or makeId"),
    );
  }
  if (makeId && year) {
    return getModelsForMakeIdYear({ makeId, year });
  }
  if (make && year) {
    return getModelsForMakeYear({ make, year });
  }
  if (makeId) {
    return getModelsForMakeId({ makeId });
  }
  if (make) {
    return getModelsForMake({ make });
  }
  return Promise.reject(new Error("Invalid parameters provided"));
};

/**
 * 
 * @param vin Vehicle Identification Number
 * @param extended boolean for whether to use the extended decoding endpoint, which provides more detailed information about the vehicle but may be slower to respond
 * @returns JSON object format like:
 * {
  Count: 140,
  Message:
    "Results returned successfully. NOTE: Any missing decoded values should be interpreted as NHTSA does not have data on the specific variable. Missing value should NOT be interpreted as an indication that a feature or technology is unavailable for a vehicle.",
  SearchCriteria: "VIN:5UXWX7C5*BA",
  Results: [
    {
      Value: "",
      ValueId: "",
      Variable: "Suggested VIN",
      VariableId: 142,
    },...]};
 */
const decodeVin = async ({
  vin,
  extended,
}: {
  vin: string;
  extended?: boolean;
}): VehicleApiResponse<DecodedVinResponse> => {
  const isValidVin = validateVin(vin);
  if (!isValidVin) {
    return Promise.reject(new Error("Invalid VIN"));
  }

  return fetch(
    `${baseUrl}DecodeVin${extended ? "Extended" : ""}/${vin}?format=json`,
  ).then((r) => r.json());
};

/**
 * This is used the same as decodeVin, but provides data in a flat format with the variable names as keys and the decoded value as the value, which is often more convenient to work with. It also allows for an optional model year parameter to be included, which can help improve the accuracy of the decoded values for certain VINs.
 *
 * @param vin Vehicle Identification Number
 * @param modelYear year of the vehicle's model (optional)
 * @returns Object with formatting like:
 *
 *   {
  Count: 140,
  Message:
    "Results returned successfully. NOTE: Any missing decoded values should be interpreted as NHTSA does not have data on the specific variable. Missing value should NOT be interpreted as an indication that a feature or technology is unavailable for a vehicle.",
  SearchCriteria: "VIN:5UXWX7C5*BA",
  Results: [
    {
      "ABS" : "Standard",
      "BasePrice": "35000",
      ...}]};
 */
const decodeVinValues = async ({
  vin,
  modelYear,
}: {
  vin: string;
  modelYear?: number;
}): VehicleApiResponse<Record<string, string>> => {
  const isValidVin = validateVin(vin);
  const hasModelYear =
    modelYear !== undefined &&
    !isNaN(modelYear) &&
    modelYear > 1900 &&
    modelYear < new Date().getFullYear() + 1;
  if (!isValidVin) {
    return Promise.reject(new Error("Invalid VIN"));
  }
  if (!hasModelYear) {
    return fetch(`${baseUrl}decodevinvalues/${vin}?format=json`).then((r) =>
      r.json(),
    );
  }
  return fetch(
    `${baseUrl}decodevinvalues/${vin}?format=json&modelyear=${modelYear}`,
  ).then((r) => r.json());
};

export const VehicleApi = {
  getMakes,
  getModels,
  decodeVin,
  decodeVinValues,
};
