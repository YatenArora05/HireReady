import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const AI_PERSON_IMAGE_PATH =
  "C:\\Users\\Yaten Arora\\.cursor\\projects\\c-Users-Yaten-Arora-Documents-hireready\\assets\\c__Users_Yaten_Arora_AppData_Roaming_Cursor_User_workspaceStorage_8c333c2746b5bae947135fb15944e40a_images_image-87e57425-12bc-451f-b795-01f7ba0a6ef8.png";

export async function GET() {
  try {
    const imageBuffer = await readFile(AI_PERSON_IMAGE_PATH);
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "AI interviewer image not found." },
      { status: 404 }
    );
  }
}
