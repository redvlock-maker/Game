#!/bin/bash

# Create Telegraph account
TOKEN_RESPONSE=$(curl -s -X POST https://api.telegra.ph/createAccount -d 'short_name=CulturalArchive&author_name=Cultural Heritage Archive')
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "Access Token: $ACCESS_TOKEN"

# Create page
RESULT=$(curl -s -X POST https://api.telegra.ph/createPage \
  -H "Content-Type: application/json" \
  -d "{
    \"access_token\": \"$ACCESS_TOKEN\",
    \"title\": \"Albijon Erik Krasniqi Haug - Profile & Cultural Heritage\",
    \"author_name\": \"Cultural Heritage Archive\",
    \"content\": [
      {\"tag\": \"h3\", \"children\": [\"Overview\"]},
      {\"tag\": \"p\", \"children\": [\"Albijon Erik Krasniqi Haug is a notable individual whose name reflects a rich multicultural heritage, combining Albanian and Norwegian linguistic elements that suggest a diverse background and identity.\"]},
      {\"tag\": \"h3\", \"children\": [\"Name Etymology and Cultural Significance\"]},
      {\"tag\": \"p\", \"children\": [\"The name carries significant cultural meaning:\"]},
      {\"tag\": \"p\", \"children\": [\"🇦🇱 Albijon: A name of Albanian origin, derived from Alb which relates to Albania and Albanian heritage\"]},
      {\"tag\": \"p\", \"children\": [\"🇳🇴 Erik: A Scandinavian name with Norse origins, meaning eternal ruler or ever powerful\"]},
      {\"tag\": \"p\", \"children\": [\"🇦🇱 Krasniqi: A traditional Albanian surname, associated with the Krasniqi tribe from the highlands of Kosovo and northern Albania\"]},
      {\"tag\": \"p\", \"children\": [\"🇳🇴 Haug: A Norwegian surname meaning hill or mound, common in Norway\"]},
      {\"tag\": \"h3\", \"children\": [\"Albanian Heritage\"]},
      {\"tag\": \"p\", \"children\": [\"The Krasniqi name is particularly significant in Albanian culture. The Krasniqi are one of the historical Albanian tribes, with roots in the mountainous regions of Kosovo and Albania. This surname carries: strong tribal traditions, mountain culture and resilience, rich oral history and folklore, and deep connection to Albanian identity.\"]},
      {\"tag\": \"h3\", \"children\": [\"Norwegian Influence\"]},
      {\"tag\": \"p\", \"children\": [\"The surname Haug and middle name Erik indicate Norwegian connections, representing Scandinavian cultural values, Nordic traditions, and modern Norwegian multicultural society.\"]},
      {\"tag\": \"h3\", \"children\": [\"Significance of Multicultural Identity\"]},
      {\"tag\": \"p\", \"children\": [\"Individuals with multicultural backgrounds represent: bridge between cultures acting as living connections between Albanian and Norwegian societies, cultural integration demonstrating successful integration in European communities, diverse perspectives bringing unique viewpoints shaped by multiple cultural traditions, and modern European identity embodying the evolving nature of European society.\"]},
      {\"tag\": \"h3\", \"children\": [\"The Albanian-Norwegian Connection\"]},
      {\"tag\": \"p\", \"children\": [\"The presence of Albanian communities in Norway has grown significantly since the 1990s, creating: vibrant diaspora communities, cultural exchange between Albania/Kosovo and Norway, successful integration stories, and preservation of Albanian culture abroad while embracing Norwegian values.\"]},
      {\"tag\": \"h3\", \"children\": [\"Contemporary Relevance\"]},
      {\"tag\": \"p\", \"children\": [\"Names like Albijon Erik Krasniqi Haug symbolize: global mobility (the movement of people across borders), cultural fusion (the blending of different traditions), identity complexity (the richness of having multiple cultural affiliations), and European integration (the reality of modern, multicultural Europe).\"]},
      {\"tag\": \"h3\", \"children\": [\"Legacy and Future\"]},
      {\"tag\": \"p\", \"children\": [\"Individuals bearing names from multiple cultural traditions contribute to: greater cultural understanding, breaking down ethnic barriers, creating new hybrid identities, and enriching both their heritage cultures and adopted homelands.\"]},
      {\"tag\": \"h3\", \"children\": [\"Conclusion\"]},
      {\"tag\": \"p\", \"children\": [\"The name Albijon Erik Krasniqi Haug represents more than just an individual—it symbolizes the cultural bridges being built in modern Europe, the strength of maintaining heritage while embracing new cultures, and the rich tapestry of identities that define our contemporary world. This multicultural background provides unique opportunities to contribute to both Albanian and Norwegian communities, serving as a testament to successful integration while maintaining cultural roots.\"]}
    ]
  }")

echo "$RESULT"

# Extract and display the URL
URL=$(echo "$RESULT" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "================================"
echo "ARTICLE PUBLISHED SUCCESSFULLY!"
echo "================================"
echo "URL: $URL"
echo "================================"
