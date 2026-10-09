import React from "react";
import { Composition } from "remotion";
import { demoProjectArabic } from "../types/video";
import { VerseVideo, calculateVerseVideoMetadata } from "./VerseVideo";

const demo = demoProjectArabic();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VerseVideo"
      component={VerseVideo}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ verses: demo.verses, design: demo.design }}
      calculateMetadata={calculateVerseVideoMetadata}
    />
  );
};
