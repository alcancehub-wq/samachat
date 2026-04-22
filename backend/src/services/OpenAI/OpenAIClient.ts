import axios, { AxiosInstance } from "axios";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

const buildClient = (apiKey: string): AxiosInstance => {
  return axios.create({
    baseURL: OPENAI_BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    timeout: 15000
  });
};

export default buildClient;
