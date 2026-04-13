export type FaqItem = {
  question: string;
  answer: string;
};

export type BreadcrumbItem = {
  name: string;
  item: string;
};

export type OfferInput = {
  price: number;
  priceCurrency?: string;
  url?: string;
  availability?: string;
};

export type AggregateRatingInput = {
  ratingValue: number;
  ratingCount: number;
};

export type ReviewInput = {
  author: string;
  reviewBody: string;
  reviewRating: {
    ratingValue: number;
    bestRating?: number;
    worstRating?: number;
  };
};

export type SoftwareApplicationSchemaInput = {
  name: string;
  description: string;
  url: string;
  brandName: string;

  applicationCategory?: string;
  applicationSubCategory?: string;
  operatingSystem?: string;
  softwareVersion?: string;

  providerName?: string;
  publisherName?: string;

  featureList?: string[];
  screenshot?: string[];
  image?: string[];

  offer?: OfferInput;
  aggregateRating?: AggregateRatingInput;
  review?: ReviewInput[];
};

type JsonLdObject = Record<string, unknown>;

export function buildSoftwareApplicationSchema(
  input: SoftwareApplicationSchemaInput,
): JsonLdObject {
  const schema: JsonLdObject = {
    "@type": ["SoftwareApplication", "WebApplication"],
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: input.applicationCategory ?? "BusinessApplication",
    operatingSystem: input.operatingSystem ?? "Web",
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
  };

  if (input.applicationSubCategory) {
    schema.applicationSubCategory = input.applicationSubCategory;
  }

  if (input.softwareVersion) {
    schema.softwareVersion = input.softwareVersion;
  }

  if (input.providerName) {
    schema.provider = {
      "@type": "Organization",
      name: input.providerName,
    };
  }

  if (input.publisherName) {
    schema.publisher = {
      "@type": "Organization",
      name: input.publisherName,
    };
  }

  if (input.featureList?.length) {
    schema.featureList = input.featureList;
  }

  if (input.screenshot?.length) {
    schema.screenshot = input.screenshot;
  }

  if (input.image?.length) {
    schema.image = input.image;
  }

  if (input.offer) {
    schema.offers = {
      "@type": "Offer",
      price: input.offer.price,
      ...(input.offer.priceCurrency
        ? { priceCurrency: input.offer.priceCurrency }
        : {}),
      ...(input.offer.url ? { url: input.offer.url } : {}),
      ...(input.offer.availability
        ? { availability: input.offer.availability }
        : {}),
    };
  }

  if (input.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      ratingCount: input.aggregateRating.ratingCount,
    };
  }

  if (input.review?.length) {
    schema.review = input.review.map((item) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: item.author,
      },
      reviewBody: item.reviewBody,
      reviewRating: {
        "@type": "Rating",
        ratingValue: item.reviewRating.ratingValue,
        ...(item.reviewRating.bestRating
          ? { bestRating: item.reviewRating.bestRating }
          : {}),
        ...(item.reviewRating.worstRating
          ? { worstRating: item.reviewRating.worstRating }
          : {}),
      },
    }));
  }

  return schema;
}

export function buildFaqSchema(items: FaqItem[]): JsonLdObject {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function buildStructuredDataGraph(
  items: JsonLdObject[],
): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": items,
    },
  ).replace(/</g, "\\u003c");
}