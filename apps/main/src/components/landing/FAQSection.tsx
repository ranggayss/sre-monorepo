"use client"

import { Container, Title, Text, Accordion, Stack, Badge, Box } from "@mantine/core"

const faqs = [
  {
    question: "How does the AI writing assistant work?",
    answer:
      "Our AI writing assistant analyzes your research context and provides intelligent suggestions for structure, content, and citations. It learns from your writing style and research domain to offer increasingly personalized assistance.",
  },
  {
    question: "Can I import my existing research library?",
    answer:
      "Yes! You can import research articles from various sources including PDF files, DOI links, and popular reference managers like Zotero, Mendeley, and EndNote. Our system will automatically extract metadata and build your knowledge graph.",
  },
  {
    question: "How does the Brain visualization work?",
    answer:
      "The Brain creates an interactive knowledge graph where each article becomes a node, and connections (edges) are formed based on shared concepts, citations, and semantic relationships. You can explore these connections visually and chat with the AI about your research collection.",
  },
  {
    question: "What citation formats are supported?",
    answer:
      "We support all major citation formats including APA, MLA, Chicago, Harvard, IEEE, and many more. Professional and Enterprise plans also allow for custom citation format creation.",
  },
  {
    question: "Is my research data secure?",
    answer:
      "Absolutely. We use enterprise-grade encryption for all data in transit and at rest. Your research data is never shared with third parties, and you maintain full ownership of your content. We are GDPR compliant and follow strict data protection protocols.",
  },
  {
    question: "Can I collaborate with my team?",
    answer:
      "Yes! Professional and Enterprise plans include team collaboration features. You can share knowledge graphs, co-write drafts, and manage team access to different research projects.",
  },
  {
    question: "What export formats are available?",
    answer:
      "You can export your drafts in multiple formats including PDF, Word (DOCX), LaTeX, HTML, and plain text. Reference lists can be exported in various citation formats or as BibTeX files.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "Our 14-day free trial gives you full access to all features of your selected plan. No credit card is required to start, and you can cancel anytime during the trial period with no obligations.",
  },
]

export function FAQSection() {
  return (
    <Box id="faq" py={80}>
      <Container size="md">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="blue" radius="xl">
            FAQ
          </Badge>
          <Title order={2} size="2.5rem" fw={700} ta="center">
            Frequently Asked Questions
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Find answers to common questions about ResearchCraft and how it can help streamline your research workflow.
          </Text>
        </Stack>

        <Accordion variant="separated" radius="md">
          {faqs.map((faq, index) => (
            <Accordion.Item key={index} value={index.toString()}>
              <Accordion.Control>
                <Text fw={500}>{faq.question}</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed">{faq.answer}</Text>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>
    </Box>
  )
}
