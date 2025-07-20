"use client"

import { Container, Title, Text, Button, Group, Stack, Box, ThemeIcon } from "@mantine/core"
import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import classes from "./CTASection.module.css"

export function CTASection() {
  return (
    <Box className={classes.cta}>
      <Container size="xl" py={80}>
        <Stack align="center" gap="xl">
          <Title order={2} size="3rem" fw={700} ta="center" c="white">
            Ready to Transform Your Research Process?
          </Title>

          <Text size="xl" ta="center" c="white" opacity={0.9} maw={700}>
            Join thousands of researchers who have revolutionized their workflow with AI-powered writing assistance and
            visual knowledge mapping.
          </Text>

          <Group gap="md" mt="md">
            <Button size="xl" variant="white" leftSection={<IconArrowRight size={20} />}>
              Start Your Free Trial
            </Button>
            <Button size="xl" variant="outline" c="white" style={{ borderColor: "white" }}>
              Schedule a Demo
            </Button>
          </Group>

          <Group gap="xl" mt="lg">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="white" color="green">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" c="white" opacity={0.9}>
                14-day free trial
              </Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="white" color="green">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" c="white" opacity={0.9}>
                No credit card required
              </Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="white" color="green">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" c="white" opacity={0.9}>
                Cancel anytime
              </Text>
            </Group>
          </Group>
        </Stack>
      </Container>
    </Box>
  )
}
