import { FastifyRouteSchemaDef } from "fastify/types/schema";
import { ObjectSchema } from "joi";

const joiOptions = {
  abortEarly: false, // return all errors
  convert: true, // change data type of data to match type keyword
  allowUnknown: false,
  noDefaults: false,
};

export const joiSchemaCompiler =
  (schema: FastifyRouteSchemaDef<ObjectSchema<any>>) => (data: any) => {
    return schema.schema.validate(data, joiOptions);
  };

export const joiSerializerCompiler =
  (schema: FastifyRouteSchemaDef<ObjectSchema<any>>) => (data: any) => {
    return JSON.stringify(data);
  };
