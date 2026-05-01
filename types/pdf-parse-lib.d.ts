declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(
    dataBuffer: Buffer
  ): Promise<{
    text?: string;
  }>;

  export default pdfParse;
}
