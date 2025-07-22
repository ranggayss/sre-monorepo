"use client"

import { Container, Title, Text, Button, Group, Stack, Badge, Image, Box, ThemeIcon } from "@mantine/core"
import { IconCheck, IconArrowRight } from "@tabler/icons-react"
import classes from "./HeroSection.module.css"
import { useRouter } from "next/navigation"

export function HeroSection() {
  const router = useRouter();

  return (
    <Box className={classes.hero}>
      <Container size="xl" py={80}>
        <Stack align="center" gap="xl">
          <Badge size="lg" variant="light" color="blue" radius="xl">
            {/* 🚀 Launching Soon - Join the Beta */}
            {/* Welcome */}
            💡 Acces Now - Try Now!
          </Badge>

          <Title order={1} size="3.5rem" fw={900} ta="center" className={classes.title} maw={800}>
            Design Your Research{" "}
            <Text component="span" c="blue" inherit>
              Draft
            </Text>{" "}
            with AI-Powered Tools
          </Title>

          <Text size="xl" className={classes.descriptionText} ta="center" maw={600}>
            Streamline your research process with intelligent writing assistance and visual knowledge mapping. From
            draft creation to citation management, we've got you covered.
          </Text>

          <Group gap="md">
            <Button size="lg" leftSection={<IconArrowRight size={18} />} 
            onClick={(e) => router.push('/signup')}
            >
              {/* Start Free Trial */}
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={(e) => router.push('/signin')}>
              {/* Watch Demo */}
              Sign In
            </Button>
          </Group>

          <Group gap="xl" mt="md">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="green">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" className={classes.descriptionText}>
                {/* No credit card required */}
                No commitment
              </Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="green">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" className={classes.descriptionText}>
                {/* 14-day free trial */}
                Explore features
              </Text>
            </Group>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="green">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" className={classes.descriptionText}>
                {/* Cancel anytime */}
                Flexible usage
              </Text>
            </Group>
          </Group>

          <Box mt={60} w="100%" maw={1000}>
            <Image
              src='/images/graph.png'
              alt="My-SRE Dashboard"
              radius="lg"
              height={300}
              className={classes.heroImage}
            />
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
