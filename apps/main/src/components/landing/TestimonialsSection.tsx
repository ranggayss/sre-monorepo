"use client"

import { Container, Title, Text, SimpleGrid, Card, Group, Avatar, Stack, Badge, Box, Rating } from "@mantine/core"

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Research Professor, MIT",
    avatar: "/placeholder.svg?height=50&width=50",
    rating: 5,
    content:
      "My-SRE has revolutionized how I approach literature reviews. The knowledge graph visualization helps me discover connections I never would have found manually.",
  },
  {
    name: "Michael Rodriguez",
    role: "PhD Student, Stanford",
    avatar: "/placeholder.svg?height=50&width=50",
    rating: 5,
    content:
      "The AI writing assistant is incredible. It helps me structure my thoughts and ensures my citations are always properly formatted. A game-changer for academic writing.",
  },
  {
    name: "Prof. Emily Watson",
    role: "Department Head, Oxford",
    avatar: "/placeholder.svg?height=50&width=50",
    rating: 5,
    content:
      "I've been using My-SRE for my team's collaborative research projects. The ability to share knowledge graphs and co-write drafts has improved our productivity immensely.",
  },
  {
    name: "David Kim",
    role: "Research Analyst, Google",
    avatar: "/placeholder.svg?height=50&width=50",
    rating: 5,
    content:
      "The Brain feature is phenomenal. Being able to chat with my research collection and get instant insights has saved me countless hours of manual searching.",
  },
  {
    name: "Dr. Lisa Patel",
    role: "Medical Researcher, Johns Hopkins",
    avatar: "/placeholder.svg?height=50&width=50",
    rating: 5,
    content:
      "As someone who works with hundreds of research papers, the automatic citation management and reference list generation features are absolutely essential.",
  },
  {
    name: "James Wilson",
    role: "Graduate Student, Harvard",
    avatar: "/placeholder.svg?height=50&width=50",
    rating: 5,
    content:
      "The learning curve was minimal, but the impact on my research workflow has been massive. I can't imagine going back to traditional research methods.",
  },
]

export function TestimonialsSection() {
  return (
    <Box id="testimonials" py={80}>
      <Container size="xl">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="blue" radius="xl">
            Testimonials
          </Badge>
          <Title order={2} size="2.5rem" fw={700} ta="center">
            Trusted by Researchers Worldwide
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Join thousands of researchers, academics, and students who have transformed their research workflow with
            My-SRE.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
          {testimonials.map((testimonial, index) => (
            <Card key={index} shadow="sm" padding="xl" radius="md" withBorder h="100%">
              <Stack gap="md" h="100%">
                <Rating value={testimonial.rating} readOnly size="sm" />
                <Text size="sm" style={{ flexGrow: 1 }}>
                  "{testimonial.content}"
                </Text>
                <Group gap="md">
                  <Avatar src={testimonial.avatar} size="md" />
                  <Stack gap={0}>
                    <Text fw={600} size="sm">
                      {testimonial.name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {testimonial.role}
                    </Text>
                  </Stack>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
