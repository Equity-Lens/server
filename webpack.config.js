const path = require("path");

module.exports = {
  mode: "production",
  target: "node",
  entry: "./src/lambda.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "lambda.js",
    libraryTarget: "commonjs2",
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Exclude AWS SDK as it's provided by Lambda runtime
    "aws-sdk": "aws-sdk",
    // Exclude other AWS Lambda runtime dependencies
    "aws-lambda": "aws-lambda",
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },
  plugins: [],
  // Lambda-specific optimizations
  node: {
    __dirname: false,
    __filename: false,
  },
  // Exclude unnecessary files from bundle
  externals: [
    // AWS SDK is provided by Lambda runtime
    "aws-sdk",
    // Lambda runtime dependencies
    "aws-lambda",
    // Optional: exclude large dependencies that might be available in Lambda
    // 'pg-native', // if using native PostgreSQL driver
  ],
};
