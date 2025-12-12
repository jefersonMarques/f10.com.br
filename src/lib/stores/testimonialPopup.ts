import { writable } from "svelte/store";

export type VideoOrientation = "landscape" | "portrait";

export type TestimonialPopupData = {
  title: string;
  fullText: string;
  author?: string;
  role?: string;
  avatar?: string;

  // Vídeo no servidor
  videoSrc?: string; // ex: "/videos/depoimentos/beatriz.mp4"
  videoType?: string; // ex: "video/mp4"
  poster?: string; // ex: "/thumbs/depoimentos/beatriz.webp"
  videoOrientation?: VideoOrientation; // "portrait" | "landscape"
};

export const showTestimonialPopup = writable(false);
export const testimonialPopupData = writable<TestimonialPopupData | null>(null);
