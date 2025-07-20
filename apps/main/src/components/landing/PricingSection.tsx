"use client"

import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Button,
  List,
  ThemeIcon,
  Stack,
  Badge,
  Box,
  Group,
  Tabs,
  useMantineColorScheme,
} from "@mantine/core"
import { IconCheck, IconX } from "@tabler/icons-react"
import { useState } from "react"

const plans = {
  monthly: [
    {
      name: "Starter",
      price: "$19",
      period: "/month",
      description: "Perfect for individual researchers and students",
      features: [
        { text: "Up to 100 articles in Brain", included: true },
        { text: "Basic AI writing assistance", included: true },
        { text: "Standard citation formats", included: true },
        { text: "Export to PDF & Word", included: true },
        { text: "Email support", included: true },
        { text: "Advanced graph analytics", included: false },
        { text: "Team collaboration", included: false },
        { text: "Priority support", included: false },
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "Ideal for active researchers and small teams",
      features: [
        { text: "Up to 1,000 articles in Brain", included: true },
        { text: "Advanced AI writing assistance", included: true },
        { text: "All citation formats", included: true },
        { text: "Export to all formats", included: true },
        { text: "Priority email support", included: true },
        { text: "Advanced graph analytics", included: true },
        { text: "Team collaboration (5 members)", included: true },
        { text: "24/7 chat support", included: false },
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "For large teams and institutions",
      features: [
        { text: "Unlimited articles in Brain", included: true },
        { text: "Premium AI writing assistance", included: true },
        { text: "Custom citation formats", included: true },
        { text: "Advanced export options", included: true },
        { text: "24/7 priority support", included: true },
        { text: "Advanced graph analytics", included: true },
        { text: "Unlimited team collaboration", included: true },
        { text: "Custom integrations", included: true },
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ],
  yearly: [
    {
      name: "Starter",
      price: "$15",
      period: "/month",
      description: "Perfect for individual researchers and students",
      features: [
        { text: "Up to 100 articles in Brain", included: true },
        { text: "Basic AI writing assistance", included: true },
        { text: "Standard citation formats", included: true },
        { text: "Export to PDF & Word", included: true },
        { text: "Email support", included: true },
        { text: "Advanced graph analytics", included: false },
        { text: "Team collaboration", included: false },
        { text: "Priority support", included: false },
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$39",
      period: "/month",
      description: "Ideal for active researchers and small teams",
      features: [
        { text: "Up to 1,000 articles in Brain", included: true },
        { text: "Advanced AI writing assistance", included: true },
        { text: "All citation formats", included: true },
        { text: "Export to all formats", included: true },
        { text: "Priority email support", included: true },
        { text: "Advanced graph analytics", included: true },
        { text: "Team collaboration (5 members)", included: true },
        { text: "24/7 chat support", included: false },
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$79",
      period: "/month",
      description: "For large teams and institutions",
      features: [
        { text: "Unlimited articles in Brain", included: true },
        { text: "Premium AI writing assistance", included: true },
        { text: "Custom citation formats", included: true },
        { text: "Advanced export options", included: true },
        { text: "24/7 priority support", included: true },
        { text: "Advanced graph analytics", included: true },
        { text: "Unlimited team collaboration", included: true },
        { text: "Custom integrations", included: true },
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ],
}

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  return (
    <Box
      id="pricing"
      py={80}
      style={{
        backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))'
      }}
    >
      <Container size="xl">
        <Stack align="center" gap="xl" mb={60}>
          <Badge size="lg" variant="light" color="blue" radius="xl">
            Pricing
          </Badge>
          <Title order={2} size="2.5rem" fw={700} ta="center">
            Simple, Transparent Pricing
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Choose the plan that fits your research needs. All plans include a 14-day free trial.
          </Text>

          <Tabs value={billingPeriod} onChange={(value) => setBillingPeriod(value as "monthly" | "yearly")}>
            <Tabs.List grow>
              <Tabs.Tab value="monthly">Monthly</Tabs.Tab>
              <Tabs.Tab value="yearly">
                Yearly
                <Badge size="xs" variant="filled" color="green" ml="xs">
                  Save 20%
                </Badge>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
          {plans[billingPeriod].map((plan, index) => (
            <Card
              key={index}
              shadow="sm"
              padding="xl"
              radius="md"
              withBorder
              style={{
                borderColor: plan.popular ? "var(--mantine-color-blue-6)" : undefined,
                borderWidth: plan.popular ? 2 : 1,
              }}
            >
              <Stack gap="md">
                {plan.popular && (
                  <Badge size="sm" variant="filled" color="blue" style={{ alignSelf: "center" }}>
                    Most Popular
                  </Badge>
                )}

                <Stack gap="xs" ta="center">
                  <Title order={3} size="xl" fw={600}>
                    {plan.name}
                  </Title>
                  <Group gap="xs" justify="center">
                    <Text size="3rem" fw={700} c="blue">
                      {plan.price}
                    </Text>
                    <Text c="dimmed">{plan.period}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {plan.description}
                  </Text>
                </Stack>

                <List spacing="sm" size="sm" center>
                  {plan.features.map((feature, featureIndex) => (
                    <List.Item
                      key={featureIndex}
                      icon={
                        <ThemeIcon size="sm" variant="light" color={feature.included ? "green" : "red"}>
                          {feature.included ? <IconCheck size={12} /> : <IconX size={12} />}
                        </ThemeIcon>
                      }
                    >
                      <Text c={feature.included ? undefined : "dimmed"}>{feature.text}</Text>
                    </List.Item>
                  ))}
                </List>

                <Button variant={plan.popular ? "filled" : "outline"} size="md" fullWidth mt="auto">
                  {plan.cta}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
