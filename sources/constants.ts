export enum SpecialToken {
  StartOfInput = `\u0000`,
  EndOfInput = `\u0001`,
  EndOfPartialInput = `\u0002`,
}

export enum NodeType {
  InitialNode = 0,
  SuccessNode = 1,
  ErrorNode = 2,
  CustomNode = 3,
}

export const HELP_COMMAND_INDEX = -1;

export const HELP_REGEX = /^(-h|--help)(?:=([0-9]+))?$/;
export const OPTION_REGEX = /^(--[a-z]+(?:-[a-z]+)*|-[a-z]+)$/i;
export const BATCH_REGEX = /^-[a-zA-Z]{2,}$/;
export const BINDING_REGEX = /^([^=]+)=([\s\S]*)$/;

export const IS_DEBUG = process.env.DEBUG_CLI === `1`;
