"use client"

import {
  Container,
  Title,
  Text,
  Timeline,
  ThemeIcon,
  Stack,
  Badge,
  Box,
  Group,
  Card,
  useMantineColorScheme,
} from "@mantine/core"
import { IconUpload, IconBrain, IconPencil, IconDownload } from "@tabler/icons-react"

const steps = [
  {
    icon: IconUpload,
    title: "Upload Your Research",
    description:
      "Import your research articles, papers, and documents into the platform. Our AI will analyze and categorize them automatically.",
    color: "blue",
  },
  {
    icon: IconBrain,
    title: "Build Your Knowledge Brain",
    description:
      "Watch as your articles are transformed into an interactive knowledge graph, revealing connections and relationships between concepts.",
    color: "purple",
  },
  {
    icon: IconPencil,
    title: "Write with AI Assistance",
    description:
      "Use our smart writer to craft your research draft with AI suggestions, automatic citations, and real-time reference management.",
    color: "green",
  },
  {
    icon: IconDownload,
    title: "Export & Share",
    description:
      "Export your completed draft in your preferred format and share your knowledge graph with collaborators.",
    color: "orange",
  },
]

export function HowItWorksSection() {
  return (
    <Box
      id="how-it-works"
      py={80}
      style={{
        backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))'
      }}
    >
      <Container size="xl">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="blue" radius="xl">
            How It Works
          </Badge>
          <Title order={2} size="2.5rem" fw={700} ta="center">
            From Research to Draft in 4 Simple Steps
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Our streamlined workflow helps you transform scattered research into coherent, well-cited academic drafts
            with unprecedented efficiency.
          </Text>
        </Stack>

        <Timeline active={3} bulletSize={60} lineWidth={3} color="blue">
          {steps.map((step, index) => (
            <Timeline.Item
              key={index}
              bullet={
                <ThemeIcon size="xl" variant="filled" color={step.color}>
                  <step.icon size={24} />
                </ThemeIcon>
              }
            >
              <Card shadow="sm" padding="xl" radius="md" withBorder mt="md">
                <Group gap="md" mb="md">
                  <Badge size="lg" variant="light" color={step.color}>
                    Step {index + 1}
                  </Badge>
                </Group>
                <Title order={3} size="xl" fw={600} mb="sm">
                  {step.title}
                </Title>
                <Text c="dimmed">{step.description}</Text>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      </Container>
    </Box>
  )
}
