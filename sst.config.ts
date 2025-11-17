import { SSTConfig } from "sst";
import { BookomolStack } from "./stacks/BookomolStack";

export default {
  config(_input) {
    return {
      name: "bookomol",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(BookomolStack);
  },
} satisfies SSTConfig;