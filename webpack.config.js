//@ts-check
const path = require('path');
const webpack = require("webpack");
const { readFileSync } = require("fs");


/**
* Parse a simple dictionary to a JavaScript Map() object.
* @param {string} string 
* @returns 
*/
function parse_json_to_map(string) {
  if (typeof string !== "string") throw new Error("Expected string.");
  let index = 0;
  // Devour >:3
  function consume() {
    const c = string[index];
    if (c === undefined) throw new Error("Reached end of file.");
    index += 1;
    return c;
  }
  /**
  * Throw an error if the current character is different.
  * @param {string} char 
  * @param {string} expected
  */
  let expect = (char, expected) => { if (expected !== char) throw new Error(`Unexpected character "${char}" at index ${index}. Expected ${expected}.`); }
  /**
  * Consume all whitespace characters. Returns the next character to be consumed.
  */
  function stride() {
    let char;
    while (true) {
      char = string[index];
      if (char === " " || char === "\n" || char === "\r") {
        consume();
        continue;
      }
      else break;
    }
    return char;
  }
  // Parse strings (keys or values).
  function parse_string() {
    expect(consume(), '"');
    let final_str = '';
    let char;
    while ((char = consume()) !== '"') final_str += char;
    return final_str;
  }
  // Parse the object.
  function parse_dict() {
    const result = [];
    stride();
    expect(consume(), "{");
    // Consume until we hit the end. Process strings.
    while (true) {
      stride();
      const key = parse_string();
      stride();
      expect(consume(), ":");
      stride();
      const value = parse_string();
      result.push([key, value]);
      stride();
      if (string[index] === ",") {
        consume();
        continue;
      }
      if (string[index] === "}") break;
    }
    expect(consume(), "}");
    return result;
  }
  return parse_dict();
}

/**
* Returns a string of tampermonkey comments from the object/map/json string.
* @param {string | {string: [key: string]} | Map | Array} raw_values 
*/
function tampermonkey_banner(raw_values) {
  let values;
  let result_string = "";
  if (raw_values instanceof Map) {
    values = [];
    raw_values.forEach((value, key) => values.push([key, value]));
  } else if (typeof raw_values == "string") {
    values = parse_json_to_map(raw_values);
  } else if (Array.isArray(raw_values)) {
    values = raw_values;
  } else {
    values = [];
    for (let key in raw_values) values.push([key, raw_values[key]]);
  }
  if (!(Array.isArray(values))) throw new Error("`values` must be an array.");
  result_string += "// ==UserScript==\n";
  values.forEach(([key, value]) => {
    result_string += `// @${key} ${value}\n`
  });
  result_string += "// ==/UserScript==\n"
  return result_string;
}

module.exports = {
  entry: './src/index.ts',
  mode: "production",
  // mode: "development",
  // devtool: 'source-map',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
/*
    innerGraph: true,
    concatenateModules: true,
    mangleExports: true,
    mergeDuplicateChunks: true,
    minimize: true,
    removeEmptyChunks: true,
    sideEffects: false,
    usedExports: "global"
*/
  },
  module: {
    rules: [
      {
        test: /\.ts$|\.tsx$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx']
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: tampermonkey_banner(readFileSync("tampermonkey.json").toString()),
      raw: true,
    }),
  ],
};
