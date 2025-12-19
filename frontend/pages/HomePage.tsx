"use client";

import { Hero } from "../components/Hero";
import { BigOffers } from "../components/BigOffers";
import { OtherOffers } from "../components/OtherOffers";
import { OtherProducts } from "../components/OtherProducts";

export function HomePage() {
  return (
    <>
      <Hero />
      <BigOffers />
      <OtherOffers />
      <OtherProducts />
    </>
  );
}

export default HomePage;
