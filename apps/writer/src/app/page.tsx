'use client'

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  Text,
  Button,
  Group,
  Stack,
  ThemeIcon,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  ColorPicker,
  Badge,
  Box,
  Avatar,
  Menu,
  Paper,
  Skeleton,
  Center,
  rem,
} from '@mantine/core';
import {
  IconPlus,
  IconBrain,
  IconCalendar,
  IconDots,
  IconEdit,
  IconTrash,
  IconCopy,
  IconShare,
  IconArticle,
  IconMessageCircle,
  IconChartDots,
  IconFolder,
  IconSearch,
  IconFolderOpen,
  IconFileText,
  IconNotes,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { eventBus } from '@sre-monorepo/lib';

interface BrainstormingProject {
  id: string;
  title: string;
  description?: string;
  coverColor: string;
  articleCount: number;
  chatCount: number;
  lastActivity: string;
  createdAt: string;
};

interface BrainstormingSession {
  id: string,
  title: string,
  description?: string,
  coverColor: string,
  lastActivity: string,
  active: boolean,
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<BrainstormingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<BrainstormingProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [sidebarOpened, setSidebarOpened] = useState(false);

  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  const brainstormingSessions: BrainstormingSession[] = projects.map(project => ({
    id: project.id,
    title: project.title,
    description: project.description,
    coverColor: project.coverColor,
    lastActivity: project.lastActivity,
    active: activeSessionId === project.id,
  }));

  const handleSessionSelect = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    router.push(`/projects/${sessionId}`)
  }, [router]);

  const handleNewSession = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleChatSelect = useCallback((chatId : number) => {
      console.log('Selected Chat');
  }, []);

  const handleToogleSidebar = useCallback(() => {
      setSidebarOpened((o) => !o);
  }, []);

  const handleNewChat = useCallback(() => {
      console.log('New Chat clicked');
  }, []);

  useEffect(() => {
      setMounted(true);
  }, []);

  // Form states
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    coverColor: '#4c6ef5',
  });

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/writer-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data = await res.json();

      const formatted: BrainstormingProject[] = data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        coverColor: p.coverColor || '#4c6ef5',
        articleCount: p._count?.articles || 0,
        chatCount: p._count?.chatMessages || 0,
        lastActivity: new Date(p.lastActivity || p.updatedAt || p.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        }),
        createdAt: new Date(p.createdAt).toISOString().split('T')[0],
        })
      );

      setProjects(formatted);
    } catch (error) {
      console.error('Gagal memuat proyek', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
  useEffect(() => {

    fetchProjects();

  }, []);

  useEffect(() => {
    function handleUpdate(){
      fetchProjects();
    }
      eventBus.on('sessionCreated', handleUpdate);
      eventBus.on('sessionDeleted', handleUpdate);
      eventBus.on('sessionUpdated', handleUpdate);
      eventBus.on('articleDeleted', handleUpdate);
  
      return () => {
        eventBus.off('sessionCreated', handleUpdate);
        eventBus.off('sessionDeleted', handleUpdate);
        eventBus.off('sessionUpdated', handleUpdate);
        eventBus.off('articleDeleted', handleUpdate);
      }
    }, []);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSessionCreatedFromSidebar = useCallback(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) return;
    try {
      const res = await fetch('/api/writer-sessions', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json'
        },
        body: JSON.stringify(newProject),
      });

      const data = await res.json();

      if (res.ok){
        await fetchProjects(); // kamu bisa pisahkan ke fungsi di luar
        eventBus.emit('sessionCreated');
        setCreateModalOpen(false);
        setNewProject({ title: '', description: '', coverColor: '#4c6ef5' });
        
        setMounted(false);
        setTimeout(() => setMounted(true), 100);
      } else {
        throw new Error('Gagal membuat proyek');
      }
    } catch (error) {
      console.error('Error', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = confirm('Apakah kamu yakin ingin menghapus proyek ini?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/writer-sessions/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok){
        await fetchProjects();
        eventBus.emit('sessionDeleted', projectId);
      } else{
        const err = await res.json();
        throw new Error(err?.error || 'Gagal menghapus proyek');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditProject = async () => {
    if (!editingProject) return;

    try {
      const res = await fetch(`/api/writer-sessions/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingProject.title,
          description: editingProject.description,
          coverColor: editingProject.coverColor,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan perubahan');
      }

      await fetchProjects();
      eventBus.emit('sessionUpdated', editingProject.id);
      setEditingProject(null);
    } catch (error) {
      console.error('Edit error:', error);
      alert('Terjadi kesalahan saat menyimpan perubahan.');
    }
  };

  const handleDuplicateProject = (project: BrainstormingProject) => {
    const duplicated: BrainstormingProject = {
      ...project,
      id: Date.now().toString(),
      title: `${project.title} (Copy)`,
      lastActivity: 'Baru dibuat',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjects(prev => [duplicated, ...prev]);
  };

  const handleDeleteArticle = async (articleId: string) => {
    await fetch(`/api/articles/${articleId}`, {
      method: 'DELETE'
    });
    eventBus.emit('articleDeleted');
  }

  const [selectedProject, setSelectedProject] = useState<BrainstormingProject | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const ProjectCard = ({ project }: { project: BrainstormingProject }) => (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder h={320} p="md"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '100%',
        //tambahan
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <Stack justify="space-between" h="100%" gap="xs" style={{ paddingBottom: '0.25rem' }}>
        {/* Header with color bar and menu */}
        <Group justify="space-between" align="flex-start">
          <Box
            style={{
              width: '100%',
              height: 6,
              borderRadius: 4,
              backgroundColor: project.coverColor,
              marginBottom: 8,
            }}
          />
          <Menu shadow="lg" width={180} position="right" offset={10}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEdit size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingProject(project);
                }}
              >
                Edit
              </Menu.Item>
              <Menu.Item
                leftSection={<IconCopy size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateProject(project)
                }}
              >
                Duplicate
              </Menu.Item>
              <Menu.Item leftSection={<IconShare size={14} />}>
                Share
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Project info */}
        <Box style={{ flexGrow: 1 }}>
          <Text size="md" fw={600} mb={4} lineClamp={2}>
            {project.title}
          </Text>
          {project.description && (
            <Box style={{ marginBottom: 4 , overflow: 'hidden'}}>
                <Text size="sm" c="dimmed" lineClamp={1} style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {project.description}
                </Text>
                <Button
                    size="xs"
                    variant="subtle"
                    color="blue"
                    mt={2}
                    px={0}
                    onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProject(project);
                    setDetailModalOpen(true);
                    }}
                >
                    Baca selengkapnya
                </Button>
            </Box>
          )}
        </Box>

        {/* Stats */}
        <Stack gap={2} style={{ marginTop: 'auto', paddingBottom: '0.5rem' }}>
            <Group gap="lg">
                <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="blue">
                      <IconArticle size={12} />
                    </ThemeIcon>
                    <Text size="xs" c="dimmed">
                      {project.articleCount} artikel
                    </Text>
                </Group>
                <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="green">
                      <IconMessageCircle size={12} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {project.chatCount} chat
                    </Text>
                </Group>
            </Group>

            {/* Footer */}
            <Group justify="space-between" align="center" mt={2}>
            <Text size="xs" c="dimmed">
                {project.lastActivity}
            </Text>
            <Badge variant="light" size="sm">
                {project.createdAt}
            </Badge>
            </Group>
        </Stack>
      </Stack>
    </Card>
  );

  const CreateProjectCard = () => (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#ddd',
        height: '100%',
        minHeight: 280,
      }}
      onClick={() => setCreateModalOpen(true)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = '#4c6ef5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#ddd';
      }}
    >
      <Center h="100%">
        <Stack align="center" gap="md">
          <ThemeIcon size={48} variant="light" color="blue" radius="xl">
            <IconPlus size={24} />
          </ThemeIcon>
          <Text size="lg" fw={500} ta="center">
            Buat Artikel Baru
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Mulai proyek penelitian baru dengan AI assistant
          </Text>
        </Stack>
      </Center>
    </Card>
  );

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <DashboardLayout
        sidebarOpened={sidebarOpened}
        onToggleSidebar={handleToogleSidebar}
        mounted={mounted}
        // onSessionCreated={handleSessionCreatedFromSidebar}
        // chatHistory={[]}
        // onChatSelect={handleChatSelect}
        // onNewChat={handleNewChat}
      >

        {/* Hero-style Header */}
        <Paper
          radius="lg"
          p="xl"
          mb="xl"
          withBorder
          style={{
            backgroundColor: '#f8f9fa',
            borderColor: '#e9ecef',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group align="center">
              <ThemeIcon size={42} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                <IconNotes size={24} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text size="xl" fw={700}>
                  Writer Sessions Projects
                </Text>
                <Text size="sm" c="dimmed">
                  Pantau dan kelola seluruh sesi penulisan artikel secara lebih mudah.
                </Text>
              </Stack>
            </Group>

            <Group gap="xs" align="center">
              <TextInput
                placeholder="Cari proyek..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ width: 240 }}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setCreateModalOpen(true)}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                Buat Proyek
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Projects Grid */}
        {loading ? (
          <Grid>
            {[...Array(6)].map((_, i) => (
              <Grid.Col key={i} span={{ base: 12, sm: 6, lg: 4 }}>
                <Card withBorder h={280}>
                  <Stack gap="md">
                    <Skeleton height={6} />
                    <Skeleton height={20} width="80%" />
                    <Skeleton height={40} />
                    <Skeleton height={15} width="60%" />
                    <Skeleton height={15} width="40%" />
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        ) : (
          <Grid>
            {/* Create new project card */}
            <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
              <CreateProjectCard />
            </Grid.Col>

          {/* Existing projects */}
          {filteredProjects.map((project) => (
            <Grid.Col key={project.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card withBorder h={320} p="md">
                <Stack gap="sm" h="100%">
                  {/* Project content - clickable area */}
                  <div 
                    onClick={() => router.push(`/projects-b/${project.id}`)}
                    style={{ 
                      cursor: 'pointer',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    }}
                  >
                    <ProjectCard project={project} />
                  </div>

                  {/* Action buttons at bottom */}
                  <Group gap="xs" style={{ borderTop: '1px solid #e9ecef', paddingTop: 8 }}>
                    <Button
                      variant="filled"
                      size="xs"
                      fullWidth
                    //   flex={1}
                      leftSection={<IconFileText size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/project/${project.id}/draft`);
                      }}
                    >
                      Writer Project
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
          </Grid>
        )}

        {/* Empty state */}
        {!loading && filteredProjects.length === 0 && searchQuery && (
          <Center py="xl">
            <Stack align="center" gap="md">
              <ThemeIcon size={64} variant="light" color="gray" radius="xl">
                <IconFolder size={32} />
              </ThemeIcon>
              <Text size="lg" c="dimmed">
                Tidak ada proyek yang ditemukan
              </Text>
              <Text size="sm" c="dimmed">
                Coba kata kunci lain atau buat proyek baru
              </Text>
            </Stack>
          </Center>
        )}

        {/* Create Project Modal */}
        <Modal
          opened={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setNewProject({ title: '', description: '', coverColor: '#4c6ef5' });
          }}
          title="Buat Writer Session Baru"
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Judul Proyek"
              placeholder="Masukkan judul proyek"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.currentTarget.value })}
              required
            />

            <Textarea
              label="Deskripsi (Opsional)"
              placeholder="Jelaskan tujuan proyek penelitian Anda"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.currentTarget.value })}
              minRows={3}
            />

            <Box>
              <Text size="sm" fw={500} mb="xs">
                Warna Cover
              </Text>
              <ColorPicker
                value={newProject.coverColor}
                onChange={(color) => setNewProject({ ...newProject, coverColor: color })}
                withPicker={false}
                swatches={[
                  '#4c6ef5', '#51cf66', '#ff6b6b', '#ffd43b',
                  '#9775fa', '#40c057', '#fd7e14', '#15aabf',
                  '#748ffc', '#69db7c', '#ffa8a8', '#ffe066',
                ]}
                swatchesPerRow={6}
              />
              {/* TAMBAH PREVIEW WARNA TERPILIH */}
              <Group mt="xs" gap="xs" align="center">
                <Text size="xs" c="dimmed">Warna terpilih:</Text>
                <Box
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    backgroundColor: newProject.coverColor,
                    border: '2px solid #e9ecef',
                  }}
                />
                <Text size="xs" c="dimmed">{newProject.coverColor}</Text>
              </Group>
            </Box>

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setCreateModalOpen(false);
                  setNewProject({ title: '', description: '', coverColor: '#4c6ef5' });
                }}
              >
                Batal
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.title.trim()}>
                Buat Proyek
              </Button>
            </Group>
          </Stack>
        </Modal>
      {/* Edit Project Modal */}
      <Modal
        opened={!!editingProject}
        onClose={() => setEditingProject(null)}
        title="Edit Writer Session"
        size="md"
      >
        {editingProject && (
          <Stack gap="md">
            <TextInput
              label="Judul Proyek"
              placeholder="Masukkan judul proyek"
              value={editingProject.title}
              onChange={(e) =>
                setEditingProject({ ...editingProject, title: e.currentTarget.value })
              }
              required
            />

            <Textarea
              label="Deskripsi (Opsional)"
              placeholder="Jelaskan tujuan proyek penelitian Anda"
              value={editingProject.description}
              onChange={(e) =>
                setEditingProject({ ...editingProject, description: e.currentTarget.value })
              }
              minRows={3}
            />

            <Box>
              <Text size="sm" fw={500} mb="xs">
                Warna Cover
              </Text>
              <ColorPicker
                value={editingProject.coverColor}
                onChange={(color) =>
                  setEditingProject({ ...editingProject, coverColor: color })
                }
                withPicker={false}
                swatches={[
                  '#4c6ef5', '#51cf66', '#ff6b6b', '#ffd43b',
                  '#9775fa', '#40c057', '#fd7e14', '#15aabf',
                  '#748ffc', '#69db7c', '#ffa8a8', '#ffe066',
                ]}
              />
            </Box>

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => setEditingProject(null)}
              >
                Batal
              </Button>
              <Button onClick={handleEditProject}>
                Simpan Perubahan
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Detail Project Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedProject(null);
        }}
        size="md"
        withCloseButton
        centered
        padding="md"
        radius="lg"
        styles={{
          body: {
            paddingTop: rem(10),
            paddingBottom: rem(20),
          },
        }}
      >
        {selectedProject && (
          <Stack gap="md">
            {/* Warna Cover Strip */}
            <Box
              style={{
                height: 6,
                borderRadius: 4,
                backgroundColor: selectedProject.coverColor,
              }}
            />

            {/* Judul Proyek */}
            <Text size="lg" fw={700}>
              {selectedProject.title}
            </Text>

            {/* Deskripsi */}
            <Paper
              shadow="xs"
              p="sm"
              radius="md"
              withBorder
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              <Text size="sm" c="dimmed">
                {selectedProject.description || 'Tidak ada deskripsi'}
              </Text>
            </Paper>

            {/* Info tambahan */}
            <Group gap="lg" mt="sm">
              <Group gap={4}>
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconArticle size={14} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">
                  {selectedProject.articleCount} artikel
                </Text>
              </Group>
              <Group gap={4}>
                <ThemeIcon size="sm" variant="light" color="green">
                  <IconMessageCircle size={14} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">
                  {selectedProject.chatCount} chat
                </Text>
              </Group>
            </Group>

            <Group justify="space-between" mt="xs">
              <Text size="xs" c="dimmed">
                Dibuat: {selectedProject.createdAt}
              </Text>
              <Badge variant="light" size="sm">
                Aktivitas Terakhir: {selectedProject.lastActivity}
              </Badge>
            </Group>
          </Stack>
        )}
      </Modal>
      </DashboardLayout>
    </Container>
  );
}