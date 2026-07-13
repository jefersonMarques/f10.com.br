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

export type PostalAddressInput = {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
};

export type ContactPointInput = {
  contactType: string;
  telephone?: string;
  email?: string;
  areaServed?: string | string[];
  availableLanguage?: string | string[];
};

export type OrganizationSchemaInput = {
  id?: string;
  "@type"?: "Organization";
  name: string;
  alternateName?: string;
  legalName?: string;
  description?: string;
  url?: string;
  logo?: string;
  image?: string | string[];
  email?: string;
  telephone?: string;
  foundingDate?: string;
  sameAs?: string[];
  address?: PostalAddressInput;
  contactPoint?: ContactPointInput[];
};

export type WebsiteSchemaInput = {
  id?: string;
  name: string;
  alternateName?: string;
  url: string;
  publisherId?: string;
  inLanguage?: string;
};

export type WebPageSchemaInput = {
  id?: string;
  pageType?: "WebPage" | "AboutPage" | "CollectionPage" | "ContactPage";
  name: string;
  description: string;
  url: string;
  isPartOfId?: string;
  aboutId?: string;
  mainEntityId?: string;
  primaryImageUrl?: string;
  inLanguage?: string;
};

export type SoftwareApplicationSchemaInput = {
  id?: string;
  name: string;
  description: string;
  url: string;
  brandName: string;

  applicationCategory?: string;
  applicationSubCategory?: string;
  operatingSystem?: string;
  softwareVersion?: string;
  inLanguage?: string;

  providerName?: string;
  publisherName?: string;
  providerId?: string;
  publisherId?: string;
  provider?: OrganizationSchemaInput;
  publisher?: OrganizationSchemaInput;

  featureList?: string[];
  screenshot?: string[];
  image?: string[];

  offer?: OfferInput;
  aggregateRating?: AggregateRatingInput;
  review?: ReviewInput[];
};

export type JsonLdObject = Record<string, unknown>;

function buildOrganizationReference(id: string): JsonLdObject {
  return { "@id": id };
}

export function buildOrganizationSchema(
  input: OrganizationSchemaInput,
): JsonLdObject {
  const schema: JsonLdObject = {
    "@type": input["@type"] ?? "Organization",
    name: input.name,
  };

  if (input.id) schema["@id"] = input.id;
  if (input.alternateName) schema.alternateName = input.alternateName;
  if (input.legalName) schema.legalName = input.legalName;
  if (input.description) schema.description = input.description;
  if (input.url) schema.url = input.url;
  if (input.logo) schema.logo = input.logo;
  if (input.image) schema.image = input.image;
  if (input.email) schema.email = input.email;
  if (input.telephone) schema.telephone = input.telephone;
  if (input.foundingDate) schema.foundingDate = input.foundingDate;
  if (input.sameAs?.length) schema.sameAs = input.sameAs;

  if (input.address) {
    schema.address = {
      "@type": "PostalAddress",
      ...input.address,
    };
  }

  if (input.contactPoint?.length) {
    schema.contactPoint = input.contactPoint.map((contact) => ({
      "@type": "ContactPoint",
      ...contact,
    }));
  }

  return schema;
}

export function buildWebsiteSchema(input: WebsiteSchemaInput): JsonLdObject {
  const schema: JsonLdObject = {
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    inLanguage: input.inLanguage ?? "pt-BR",
  };

  if (input.id) schema["@id"] = input.id;
  if (input.alternateName) schema.alternateName = input.alternateName;
  if (input.publisherId) {
    schema.publisher = buildOrganizationReference(input.publisherId);
  }

  return schema;
}

export function buildWebPageSchema(input: WebPageSchemaInput): JsonLdObject {
  const schema: JsonLdObject = {
    "@type": input.pageType ?? "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage ?? "pt-BR",
  };

  if (input.id) schema["@id"] = input.id;
  if (input.isPartOfId) schema.isPartOf = { "@id": input.isPartOfId };
  if (input.aboutId) schema.about = { "@id": input.aboutId };
  if (input.mainEntityId) schema.mainEntity = { "@id": input.mainEntityId };
  if (input.primaryImageUrl) {
    schema.primaryImageOfPage = {
      "@type": "ImageObject",
      url: input.primaryImageUrl,
    };
  }

  return schema;
}

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

  if (input.id) schema["@id"] = input.id;
  if (input.inLanguage) schema.inLanguage = input.inLanguage;

  if (input.applicationSubCategory) {
    schema.applicationSubCategory = input.applicationSubCategory;
  }

  if (input.softwareVersion) {
    schema.softwareVersion = input.softwareVersion;
  }

  if (input.providerId) {
    schema.provider = buildOrganizationReference(input.providerId);
  } else if (input.provider) {
    schema.provider = buildOrganizationSchema(input.provider);
  } else if (input.providerName) {
    schema.provider = {
      "@type": "Organization",
      name: input.providerName,
    };
  }

  if (input.publisherId) {
    schema.publisher = buildOrganizationReference(input.publisherId);
  } else if (input.publisher) {
    schema.publisher = buildOrganizationSchema(input.publisher);
  } else if (input.publisherName) {
    schema.publisher = {
      "@type": "Organization",
      name: input.publisherName,
    };
  }

  if (input.featureList?.length) schema.featureList = input.featureList;
  if (input.screenshot?.length) schema.screenshot = input.screenshot;
  if (input.image?.length) schema.image = input.image;

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

export function buildStructuredDataGraph(items: JsonLdObject[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": items,
  }).replace(/</g, "\\u003c");
}
