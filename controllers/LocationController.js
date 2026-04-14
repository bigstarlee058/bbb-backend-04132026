const axios = require("axios");
const asyncHandler = require("express-async-handler");

const getCountryList = asyncHandler(async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://restcountries.com/v3.1/all?fields=name"
    );
    const countries = data
      .map((c) => c.name.common)
      .sort((a, b) => a.localeCompare(b));
    res.status(200).json({ countries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getStatesList = asyncHandler(async (req, res) => {
  try {
    const { country } = req.params;
    const { data } = await axios.post(
      "https://countriesnow.space/api/v0.1/countries/states",
      { country }
    );
    const states = data?.data?.states?.map((s) => s.name) || [];
    if (!states.length)
      return res
        .status(404)
        .json({ result: false, message: "No states found for this country." });
    res.status(200).json({ states });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

const getCitiesList = asyncHandler(async (req, res) => {
  try {
    const { country, state } = req.params;
    const { data } = await axios.post(
      "https://countriesnow.space/api/v0.1/countries/state/cities",
      { country, state }
    );
    const cities = data?.data || [];
    if (!cities.length)
      return res
        .status(404)
        .json({ result: false, message: "No cities found for this state." });
    res.status(200).json({ cities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ result: false, message: error.message });
  }
});

module.exports = {
  getCountryList,
  getStatesList,
  getCitiesList,
};
