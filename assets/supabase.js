import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://edghbquwmwmmllkagfah.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZ2hicXV3bXdtbWxsa2FnZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDU0NzksImV4cCI6MjA4NjkyMTQ3OX0.o8f_7Mv40nU-U6R--dSun7_yvKzDLonQBJSRwgB46ig"
);

export async function cargarImagenBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}