"use client"

import { Container, Group, Text, SimpleGrid, Stack, Anchor, Divider, ActionIcon, Box , Image} from "@mantine/core"
import { IconBrandTwitter, IconBrandLinkedin, IconBrandGithub, IconBrain } from "@tabler/icons-react"
import Link from "next/link"

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "API", href: "/api" },
    { label: "Integrations", href: "/integrations" },
  ],
  resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Tutorials", href: "/tutorials" },
    { label: "Blog", href: "/blog" },
    { label: "Research Guide", href: "/guide" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Press Kit", href: "/press" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR", href: "/gdpr" },
  ],
}

export function Footer() {
  return (
    <Box component="footer" bg="var(--mantine-color-gray-9)" c="white">
      <Container size="xl" py={60}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="xl">
          <Stack gap="md">
            <Group gap="xs">
              {/* <IconBrain size={32} color="var(--mantine-color-blue-4)" /> */}
              <Box>
                <Image
                src='/images/LogoSRE_Fix.png'
                alt="My-SRE Dashboard"
                height={40}
                radius="xs"
                // className={classes.heroImage}
                />
            </Box>
              {/* <Text size="xl" fw={700} c="blue.4">
                My-SRE
              </Text> */}
            </Group>
            <Text size="sm" c="dimmed" maw={250}>
              Empowering researchers with AI-driven tools for intelligent writing and visual knowledge mapping.
            </Text>
            <Group gap="xs">
              <ActionIcon variant="subtle" size="lg" color="gray">
                <IconBrandTwitter size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="lg" color="gray">
                <IconBrandLinkedin size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="lg" color="gray">
                <IconBrandGithub size={18} />
              </ActionIcon>
            </Group>
          </Stack>

          <Stack gap="md">
            <Text fw={600} size="sm">
              Product
            </Text>
            {footerLinks.product.map((link) => (
              <Anchor
                key={link.label}
                component={Link}
                href={link.href}
                size="sm"
                c="dimmed"
                style={{ textDecoration: "none" }}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>

          <Stack gap="md">
            <Text fw={600} size="sm">
              Resources
            </Text>
            {footerLinks.resources.map((link) => (
              <Anchor
                key={link.label}
                component={Link}
                href={link.href}
                size="sm"
                c="dimmed"
                style={{ textDecoration: "none" }}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>

          <Stack gap="md">
            <Text fw={600} size="sm">
              Company
            </Text>
            {footerLinks.company.map((link) => (
              <Anchor
                key={link.label}
                component={Link}
                href={link.href}
                size="sm"
                c="dimmed"
                style={{ textDecoration: "none" }}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>

          <Stack gap="md">
            <Text fw={600} size="sm">
              Legal
            </Text>
            {footerLinks.legal.map((link) => (
              <Anchor
                key={link.label}
                component={Link}
                href={link.href}
                size="sm"
                c="dimmed"
                style={{ textDecoration: "none" }}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>
        </SimpleGrid>

        <Divider my="xl" color="gray.8" />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            © {new Date().getFullYear()} My-SRE. All rights reserved.
          </Text>
          <Group gap="md">
            <Anchor href="/privacy" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
              Privacy
            </Anchor>
            <Anchor href="/terms" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
              Terms
            </Anchor>
            <Anchor href="/cookies" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
              Cookies
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}
