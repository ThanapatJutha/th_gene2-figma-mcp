import {
  Box,
  Button,
  Badge,
  Card,
  Alert,
  Tag,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Container,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { LuPlus, LuCheck, LuX, LuTrash2, LuDownload } from "react-icons/lu";

/* ─── Section wrapper ─── */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box mb="12">
      <Heading size="lg" mb="1" color="gray.800">
        {title}
      </Heading>
      <Box h="1px" bg="gray.200" mb="6" />
      {children}
    </Box>
  );
}

/* ─── Label ─── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="xs" fontWeight="600" color="gray.500" mb="2">
      {children}
    </Text>
  );
}

export default function App() {
  return (
    <Box bg="white" minH="100vh" py="12">
      <Container maxW="1200px">
        <Heading size="2xl" mb="2" color="gray.900">
          Chakra UI Component Showcase
        </Heading>
        <Text color="gray.500" mb="10">
          All component variants rendered with Chakra UI v3
        </Text>

        {/* ═══════════════════════════════════════════════
            1. BUTTONS
        ═══════════════════════════════════════════════ */}
        <Section title="Buttons">
          {/* Solid variants */}
          <Label>Solid Variants</Label>
          <HStack gap="4" mb="6" flexWrap="wrap">
            <Button colorPalette="gray">Gray</Button>
            <Button colorPalette="red">Red</Button>
            <Button colorPalette="orange">Orange</Button>
            <Button colorPalette="yellow">Yellow</Button>
            <Button colorPalette="green">Green</Button>
            <Button colorPalette="teal">Teal</Button>
            <Button colorPalette="blue">Blue</Button>
            <Button colorPalette="cyan">Cyan</Button>
            <Button colorPalette="purple">Purple</Button>
            <Button colorPalette="pink">Pink</Button>
          </HStack>

          {/* Style variants */}
          <Label>Style Variants</Label>
          <HStack gap="4" mb="6" flexWrap="wrap">
            <Button variant="solid" colorPalette="blue">
              Solid
            </Button>
            <Button variant="outline" colorPalette="blue">
              Outline
            </Button>
            <Button variant="ghost" colorPalette="blue">
              Ghost
            </Button>
            <Button variant="plain" colorPalette="blue">
              Plain
            </Button>
            <Button variant="subtle" colorPalette="blue">
              Subtle
            </Button>
            <Button variant="surface" colorPalette="blue">
              Surface
            </Button>
          </HStack>

          {/* Sizes */}
          <Label>Sizes</Label>
          <HStack gap="4" mb="6" alignItems="center" flexWrap="wrap">
            <Button size="xs" colorPalette="blue">
              Extra Small
            </Button>
            <Button size="sm" colorPalette="blue">
              Small
            </Button>
            <Button size="md" colorPalette="blue">
              Medium
            </Button>
            <Button size="lg" colorPalette="blue">
              Large
            </Button>
            <Button size="xl" colorPalette="blue">
              Extra Large
            </Button>
          </HStack>

          {/* With Icons */}
          <Label>With Icons</Label>
          <HStack gap="4" mb="6" flexWrap="wrap">
            <Button colorPalette="green">
              <LuPlus /> Add Item
            </Button>
            <Button colorPalette="red" variant="outline">
              <LuTrash2 /> Delete
            </Button>
            <Button colorPalette="blue" variant="subtle">
              <LuDownload /> Download
            </Button>
          </HStack>

          {/* Icon Buttons */}
          <Label>Icon Buttons</Label>
          <HStack gap="4" mb="6" flexWrap="wrap">
            <IconButton aria-label="Add" colorPalette="blue">
              <LuPlus />
            </IconButton>
            <IconButton aria-label="Check" colorPalette="green">
              <LuCheck />
            </IconButton>
            <IconButton aria-label="Close" colorPalette="red" variant="outline">
              <LuX />
            </IconButton>
            <IconButton
              aria-label="Delete"
              colorPalette="red"
              variant="ghost"
            >
              <LuTrash2 />
            </IconButton>
          </HStack>

          {/* States */}
          <Label>States</Label>
          <HStack gap="4" mb="6" flexWrap="wrap">
            <Button colorPalette="blue">Normal</Button>
            <Button colorPalette="blue" disabled>
              Disabled
            </Button>
            <Button colorPalette="blue" loading>
              Loading
            </Button>
            <Button colorPalette="blue" loading loadingText="Saving...">
              Saving
            </Button>
          </HStack>
        </Section>

        {/* ═══════════════════════════════════════════════
            2. BADGES
        ═══════════════════════════════════════════════ */}
        <Section title="Badges">
          {/* Solid */}
          <Label>Solid Variants</Label>
          <HStack gap="3" mb="6" flexWrap="wrap">
            <Badge colorPalette="gray">Gray</Badge>
            <Badge colorPalette="red">Red</Badge>
            <Badge colorPalette="orange">Orange</Badge>
            <Badge colorPalette="yellow">Yellow</Badge>
            <Badge colorPalette="green">Green</Badge>
            <Badge colorPalette="teal">Teal</Badge>
            <Badge colorPalette="blue">Blue</Badge>
            <Badge colorPalette="cyan">Cyan</Badge>
            <Badge colorPalette="purple">Purple</Badge>
            <Badge colorPalette="pink">Pink</Badge>
          </HStack>

          {/* Style variants */}
          <Label>Style Variants</Label>
          <HStack gap="3" mb="6" flexWrap="wrap">
            <Badge variant="solid" colorPalette="blue">
              Solid
            </Badge>
            <Badge variant="subtle" colorPalette="blue">
              Subtle
            </Badge>
            <Badge variant="outline" colorPalette="blue">
              Outline
            </Badge>
            <Badge variant="surface" colorPalette="blue">
              Surface
            </Badge>
            <Badge variant="plain" colorPalette="blue">
              Plain
            </Badge>
          </HStack>

          {/* Sizes */}
          <Label>Sizes</Label>
          <HStack gap="3" mb="6" flexWrap="wrap" alignItems="center">
            <Badge size="xs" colorPalette="green">
              XS
            </Badge>
            <Badge size="sm" colorPalette="green">
              SM
            </Badge>
            <Badge size="md" colorPalette="green">
              MD
            </Badge>
            <Badge size="lg" colorPalette="green">
              LG
            </Badge>
          </HStack>
        </Section>

        {/* ═══════════════════════════════════════════════
            3. CARDS
        ═══════════════════════════════════════════════ */}
        <Section title="Cards">
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6" mb="6">
            {/* Elevated */}
            <Card.Root variant="elevated">
              <Card.Header>
                <Card.Title>Elevated Card</Card.Title>
                <Card.Description>
                  This card has a shadow elevation effect
                </Card.Description>
              </Card.Header>
              <Card.Body>
                <Text color="gray.600">
                  Cards are used to group related content. This variant uses
                  shadow for depth.
                </Text>
              </Card.Body>
              <Card.Footer>
                <Button variant="outline" colorPalette="blue" size="sm">
                  Learn More
                </Button>
              </Card.Footer>
            </Card.Root>

            {/* Outline */}
            <Card.Root variant="outline">
              <Card.Header>
                <Card.Title>Outline Card</Card.Title>
                <Card.Description>
                  This card has a border outline style
                </Card.Description>
              </Card.Header>
              <Card.Body>
                <Text color="gray.600">
                  A more subtle card style with a border instead of a shadow.
                  Great for lists.
                </Text>
              </Card.Body>
              <Card.Footer>
                <Button variant="solid" colorPalette="blue" size="sm">
                  Action
                </Button>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </Card.Footer>
            </Card.Root>

            {/* Subtle */}
            <Card.Root variant="subtle">
              <Card.Header>
                <Card.Title>Subtle Card</Card.Title>
                <Card.Description>
                  This card has a subtle background fill
                </Card.Description>
              </Card.Header>
              <Card.Body>
                <Text color="gray.600">
                  Subtle cards use a light background fill. Perfect for
                  dashboards and data displays.
                </Text>
              </Card.Body>
              <Card.Footer>
                <HStack gap="2">
                  <Badge colorPalette="green">Active</Badge>
                  <Badge colorPalette="blue">New</Badge>
                </HStack>
              </Card.Footer>
            </Card.Root>

            {/* Card with stats */}
            <Card.Root variant="elevated">
              <Card.Header>
                <Card.Title>Revenue</Card.Title>
                <Card.Description>Monthly overview</Card.Description>
              </Card.Header>
              <Card.Body>
                <VStack align="start" gap="1">
                  <Text fontSize="3xl" fontWeight="bold" color="green.600">
                    $45,231
                  </Text>
                  <HStack>
                    <Badge colorPalette="green" variant="subtle">
                      +20.1%
                    </Badge>
                    <Text fontSize="sm" color="gray.500">
                      vs last month
                    </Text>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Card with user info */}
            <Card.Root variant="outline">
              <Card.Header>
                <HStack gap="3">
                  <Box
                    w="10"
                    h="10"
                    borderRadius="full"
                    bg="blue.500"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="white" fontWeight="bold">
                      JD
                    </Text>
                  </Box>
                  <VStack align="start" gap="0">
                    <Card.Title fontSize="md">John Doe</Card.Title>
                    <Card.Description>Software Engineer</Card.Description>
                  </VStack>
                </HStack>
              </Card.Header>
              <Card.Body>
                <Text fontSize="sm" color="gray.600">
                  Building amazing user interfaces with Chakra UI and React.
                </Text>
              </Card.Body>
              <Card.Footer>
                <Button size="sm" variant="outline" colorPalette="blue">
                  Follow
                </Button>
                <Button size="sm" variant="ghost">
                  Message
                </Button>
              </Card.Footer>
            </Card.Root>

            {/* Card with loading */}
            <Card.Root variant="subtle">
              <Card.Header>
                <Card.Title>Processing</Card.Title>
                <Card.Description>Please wait...</Card.Description>
              </Card.Header>
              <Card.Body>
                <HStack gap="3">
                  <Spinner size="sm" colorPalette="blue" />
                  <Text color="gray.600" fontSize="sm">
                    Uploading your files...
                  </Text>
                </HStack>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>
        </Section>

        {/* ═══════════════════════════════════════════════
            4. ALERTS
        ═══════════════════════════════════════════════ */}
        <Section title="Alerts">
          <VStack gap="4" mb="6" align="stretch">
            {/* Info */}
            <Alert.Root status="info">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Info Alert</Alert.Title>
                <Alert.Description>
                  Chakra UI v3 provides a set of accessible and composable
                  components.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            {/* Success */}
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Success!</Alert.Title>
                <Alert.Description>
                  Your application has been submitted successfully.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            {/* Warning */}
            <Alert.Root status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Warning</Alert.Title>
                <Alert.Description>
                  Your trial period is about to expire. Upgrade now to keep
                  access.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            {/* Error */}
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>
                  There was an error processing your request. Please try again.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            {/* Neutral */}
            <Alert.Root status="neutral">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Neutral</Alert.Title>
                <Alert.Description>
                  This is a neutral informational message with no urgency.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          </VStack>
        </Section>

        {/* ═══════════════════════════════════════════════
            5. TAGS
        ═══════════════════════════════════════════════ */}
        <Section title="Tags">
          {/* Color variants */}
          <Label>Color Variants</Label>
          <HStack gap="3" mb="6" flexWrap="wrap">
            <Tag.Root colorPalette="gray">
              <Tag.Label>Gray</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="red">
              <Tag.Label>Red</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="orange">
              <Tag.Label>Orange</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="yellow">
              <Tag.Label>Yellow</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="green">
              <Tag.Label>Green</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="teal">
              <Tag.Label>Teal</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="blue">
              <Tag.Label>Blue</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="cyan">
              <Tag.Label>Cyan</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="purple">
              <Tag.Label>Purple</Tag.Label>
            </Tag.Root>
            <Tag.Root colorPalette="pink">
              <Tag.Label>Pink</Tag.Label>
            </Tag.Root>
          </HStack>

          {/* Style variants */}
          <Label>Style Variants</Label>
          <HStack gap="3" mb="6" flexWrap="wrap">
            <Tag.Root variant="solid" colorPalette="blue">
              <Tag.Label>Solid</Tag.Label>
            </Tag.Root>
            <Tag.Root variant="subtle" colorPalette="blue">
              <Tag.Label>Subtle</Tag.Label>
            </Tag.Root>
            <Tag.Root variant="outline" colorPalette="blue">
              <Tag.Label>Outline</Tag.Label>
            </Tag.Root>
            <Tag.Root variant="surface" colorPalette="blue">
              <Tag.Label>Surface</Tag.Label>
            </Tag.Root>
            <Tag.Root variant="plain" colorPalette="blue">
              <Tag.Label>Plain</Tag.Label>
            </Tag.Root>
          </HStack>

          {/* Sizes */}
          <Label>Sizes</Label>
          <HStack gap="3" mb="6" flexWrap="wrap" alignItems="center">
            <Tag.Root size="sm" colorPalette="purple">
              <Tag.Label>Small</Tag.Label>
            </Tag.Root>
            <Tag.Root size="md" colorPalette="purple">
              <Tag.Label>Medium</Tag.Label>
            </Tag.Root>
            <Tag.Root size="lg" colorPalette="purple">
              <Tag.Label>Large</Tag.Label>
            </Tag.Root>
            <Tag.Root size="xl" colorPalette="purple">
              <Tag.Label>Extra Large</Tag.Label>
            </Tag.Root>
          </HStack>

          {/* With close trigger */}
          <Label>Closable Tags</Label>
          <HStack gap="3" mb="6" flexWrap="wrap">
            <Tag.Root colorPalette="blue">
              <Tag.Label>React</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Tag.Root colorPalette="green">
              <Tag.Label>TypeScript</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Tag.Root colorPalette="purple">
              <Tag.Label>Chakra UI</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Tag.Root colorPalette="orange">
              <Tag.Label>Vite</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
            <Tag.Root colorPalette="red">
              <Tag.Label>Figma</Tag.Label>
              <Tag.CloseTrigger />
            </Tag.Root>
          </HStack>
        </Section>
      </Container>
    </Box>
  );
}
