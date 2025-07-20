"use client"

import { Container, Title, Text, SimpleGrid, Card, Group, ThemeIcon, Stack, Badge, Box } from "@mantine/core"
import {
  IconPencil,
  IconBrain,
  IconFileText,
  IconQuote,
  IconGraph,
  IconMessageChatbot,
  IconSearch,
  IconDownload,
  IconShare,
} from "@tabler/icons-react"

const features = [
  {
    icon: IconPencil,
    title: "Smart Writer",
    description:
      "AI-powered writing assistant that helps you craft compelling research drafts with intelligent suggestions and structure guidance.",
    color: "blue",
    category: "Writer",
  },
  {
    icon: IconQuote,
    title: "Citation Management",
    description:
      "Seamlessly cite articles from your Brain knowledge base with automatic formatting and reference list generation.",
    color: "green",
    category: "Writer",
  },
  {
    icon: IconFileText,
    title: "Reference Lists",
    description:
      "Automatically generated and formatted reference lists that update in real-time as you add citations to your draft.",
    color: "orange",
    category: "Writer",
  },
  {
    icon: IconBrain,
    title: "Knowledge Brain",
    description:
      "Visual knowledge mapping system that organizes your research articles into an interactive graph network.",
    color: "purple",
    category: "Brain",
  },
  {
    icon: IconGraph,
    title: "Interactive Graph",
    description:
      "Explore connections between articles through nodes and edges, revealing hidden relationships in your research.",
    color: "teal",
    category: "Brain",
  },
  {
    icon: IconMessageChatbot,
    title: "AI Chat Assistant",
    description: "Ask questions about your research collection and get intelligent insights from your knowledge base.",
    color: "red",
    category: "Brain",
  },
//   {
//     icon: IconSearch,
//     title: "Smart Search",
//     description:
//       "Find relevant articles and connections across your entire research collection with semantic search capabilities.",
//     color: "indigo",
//     category: "Core",
//   },
//   {
//     icon: IconDownload,
//     title: "Export Options",
//     description:
//       "Export your drafts and references in multiple formats including PDF, Word, LaTeX, and citation styles.",
//     color: "cyan",
//     category: "Core",
//   },
//   {
//     icon: IconShare,
//     title: "Collaboration",
//     description: "Share your research drafts and knowledge graphs with collaborators for seamless teamwork.",
//     color: "yellow",
//     category: "Core",
//   },
]

export function FeaturesSection() {
  return (
    <Box id="features" py={80}>
      <Container size="xl">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="blue" radius="xl">
            Features
          </Badge>
          <Title order={2} size="2.5rem" fw={700} ta="center">
            Everything You Need for Research Excellence
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Our comprehensive platform combines intelligent writing tools with visual knowledge management to
            revolutionize your research workflow.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
          {features.map((feature, index) => (
            <Card key={index} shadow="sm" padding="xl" radius="md" withBorder>
              <Stack gap="md">
                <Group gap="md">
                  <ThemeIcon size="xl" variant="light" color={feature.color}>
                    <feature.icon size={24} />
                  </ThemeIcon>
                  <Badge size="sm" variant="dot" color={feature.color}>
                    {feature.category}
                  </Badge>
                </Group>
                <Title order={3} size="xl" fw={600}>
                  {feature.title}
                </Title>
                <Text c="dimmed" size="sm">
                  {feature.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
