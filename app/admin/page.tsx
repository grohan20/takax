"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Download,
  MessageSquare,
  ClipboardCheck,
  AlertTriangle,
  Settings,
} from "lucide-react"
import TaskManagement from "@/components/admin/task-management"
import ProofReview from "@/components/admin/proof-review"
import SupportMessages from "@/components/admin/support-messages"
import { FirebaseStatusBanner } from "@/components/firebase-status-banner"
import { FirebaseDiagnostics } from "@/components/firebase-diagnostics"
import {
  getAdminDashboardStats,
  getAllUsers,
  getWithdrawalsByStatus,
  updateUserStatus,
  updateWithdrawalStatus,
  checkFirebaseAvailability,
} from "@/lib/firebase"

export default function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalTasks: 0,
    activeTasks: 0,
    totalTeams: 0,
    activeTeams: 0,
  })
  const [users, setUsers] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        console.log("[v0] Loading admin dashboard data...")
        setLoading(true)
        setError(null)

        const firebaseAvailable = await checkFirebaseAvailability()
        setIsFirebaseAvailable(firebaseAvailable)

        if (!firebaseAvailable) {
          console.log("[v0] Firebase unavailable, loading with fallback data")
        }

        let dashboardStats = {
          totalUsers: 0,
          activeUsers: 0,
          pendingWithdrawals: 0,
          totalWithdrawalAmount: 0,
          totalTasks: 0,
          todaySubmissions: 0,
        }

        let usersData = { users: [], total: 0 }
        let withdrawalsData = []

        try {
          dashboardStats = await getAdminDashboardStats()
          console.log("[v0] Dashboard stats loaded successfully")
        } catch (statsError) {
          console.error("[v0] Error loading dashboard stats:", statsError)
          if (firebaseAvailable) {
            setError("Failed to load dashboard statistics. Please check your Firebase configuration.")
          }
        }

        try {
          usersData = await getAllUsers({
            page: 1,
            limit: 10,
            search: searchTerm,
            status: filterStatus === "all" ? undefined : filterStatus,
          })
          console.log("[v0] Users data loaded successfully")
        } catch (usersError) {
          console.error("[v0] Error loading users:", usersError)
          if (firebaseAvailable && !error) {
            setError("Failed to load users data. Please check your Firebase configuration.")
          }
        }

        try {
          withdrawalsData = await getWithdrawalsByStatus("pending")
          console.log("[v0] Withdrawals data loaded successfully")
        } catch (withdrawalsError) {
          console.error("[v0] Error loading withdrawals:", withdrawalsError)
          if (firebaseAvailable && !error) {
            setError("Failed to load withdrawals data. Please check your Firebase configuration.")
          }
        }

        setStats({
          totalUsers: dashboardStats.totalUsers || 0,
          activeUsers: dashboardStats.activeUsers || 0,
          totalWithdrawals: dashboardStats.totalWithdrawalAmount || 0,
          pendingWithdrawals: dashboardStats.pendingWithdrawals || 0,
          totalTasks: dashboardStats.totalTasks || 0,
          activeTasks: dashboardStats.totalTasks || 0,
          totalTeams: 0,
          activeTeams: 0,
        })
        setUsers(usersData.users || [])
        setWithdrawals(withdrawalsData || [])
        setLoading(false)
      } catch (error) {
        console.error("[v0] Error loading dashboard data:", error)
        setError("Failed to initialize admin dashboard. Please check Firebase configuration.")
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [searchTerm, filterStatus])

  const handleUserAction = async (userId: string, action: string, reason?: string) => {
    try {
      await updateUserStatus(userId, action, reason)
      // Refresh users data
      const usersData = await getAllUsers({
        page: 1,
        limit: 10,
        search: searchTerm,
        status: filterStatus === "all" ? undefined : filterStatus,
      })
      setUsers(usersData.users)
    } catch (error) {
      console.error("Error updating user:", error)
      setError(error.message || "Failed to update user status. Please try again.")
    }
  }

  const handleWithdrawalAction = async (withdrawalId: string, action: string, reason?: string) => {
    try {
      await updateWithdrawalStatus(withdrawalId, action, reason, "admin")
      // Refresh withdrawals data
      const withdrawalsData = await getWithdrawalsByStatus("pending")
      setWithdrawals(withdrawalsData)
    } catch (error) {
      console.error("Error updating withdrawal:", error)
      setError(error.message || "Failed to update withdrawal status. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">TakaX Admin Panel</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage users, tasks, and system settings</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-transparent">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Badge
                variant="outline"
                className={`text-xs ${
                  isFirebaseAvailable
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}
              >
                <span className="hidden sm:inline">{isFirebaseAvailable ? "System Online" : "Database Offline"}</span>
                <span className="sm:hidden">{isFirebaseAvailable ? "Online" : "Offline"}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <FirebaseStatusBanner />

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Database Connection Error:</strong> {error}
              <br />
              <span className="text-sm mt-1 block">
                {!isFirebaseAvailable
                  ? "Running in demo mode with sample data. Enable Firebase Realtime Database for full functionality."
                  : "Please ensure Firebase Realtime Database is enabled in your Firebase Console and the database rules allow read/write access."}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Users</p>
                  <p className="text-sm sm:text-xl font-bold truncate">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-green-500 truncate">+{stats.activeUsers.toLocaleString()} active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Withdrawals</p>
                  <p className="text-sm sm:text-xl font-bold truncate">৳{stats.totalWithdrawals.toLocaleString()}</p>
                  <p className="text-xs text-yellow-500 truncate">৳{stats.pendingWithdrawals} pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Tasks</p>
                  <p className="text-sm sm:text-xl font-bold">{stats.totalTasks}</p>
                  <p className="text-xs text-blue-500">{stats.activeTasks} active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Teams</p>
                  <p className="text-sm sm:text-xl font-bold">{stats.totalTeams}</p>
                  <p className="text-xs text-purple-500">{stats.activeTeams} active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 min-w-[320px]">
              <TabsTrigger value="users" className="text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Users</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="text-xs sm:text-sm">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Withdrawals</span>
                <span className="sm:hidden">Money</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs sm:text-sm">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tasks</span>
                <span className="sm:hidden">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="proofs" className="text-xs sm:text-sm">
                <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Proofs</span>
                <span className="sm:hidden">Proofs</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="text-xs sm:text-sm">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Support</span>
                <span className="sm:hidden">Support</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="text-xs sm:text-sm">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Diagnostics</span>
                <span className="sm:hidden">Debug</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                        disabled={!isFirebaseAvailable}
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus} disabled={!isFirebaseAvailable}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!isFirebaseAvailable ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">Demo Mode - Sample Data</p>
                    <p className="text-xs text-muted-foreground">Enable Firebase Realtime Database for live data</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3 sm:gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{user.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.username}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex justify-between sm:block sm:text-right">
                            <div>
                              <p className="font-medium text-sm sm:text-base">{user.coins || 0} Tk</p>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={user.status === "active" ? "default" : "destructive"} className="sm:hidden">
                              {user.status}
                            </Badge>
                          </div>
                          <Badge
                            variant={user.status === "active" ? "default" : "destructive"}
                            className="hidden sm:inline-flex"
                          >
                            {user.status}
                          </Badge>
                          <div className="flex items-center gap-1 justify-end sm:justify-start">
                            <Button variant="ghost" size="sm" disabled={!isFirebaseAvailable}>
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={!isFirebaseAvailable}>
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!isFirebaseAvailable}
                              onClick={() => handleUserAction(user.id, user.status === "active" ? "banned" : "active")}
                            >
                              <Ban className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Pending Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                {!isFirebaseAvailable ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">Demo Mode - Sample Data</p>
                    <p className="text-xs text-muted-foreground">Enable Firebase Realtime Database for live data</p>
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending withdrawals.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map((withdrawal: any) => (
                      <div
                        key={withdrawal.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3 sm:gap-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base">{withdrawal.user || "Unknown User"}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            ৳{withdrawal.amount} via {withdrawal.method} •{" "}
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Badge
                            variant={withdrawal.status === "pending" ? "outline" : "secondary"}
                            className="text-center sm:text-left"
                          >
                            {withdrawal.status}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700 bg-transparent flex-1 sm:flex-none"
                              disabled={!isFirebaseAvailable}
                              onClick={() => handleWithdrawalAction(withdrawal.id, "approved")}
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="text-xs sm:text-sm">Approve</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 bg-transparent flex-1 sm:flex-none"
                              disabled={!isFirebaseAvailable}
                              onClick={() =>
                                handleWithdrawalAction(
                                  withdrawal.id,
                                  "rejected",
                                  "Invalid proof or requirements not met",
                                )
                              }
                            >
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="text-xs sm:text-sm">Reject</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <TaskManagement />
          </TabsContent>

          <TabsContent value="proofs" className="space-y-4">
            <ProofReview />
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <SupportMessages />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm sm:text-base">
                    {isFirebaseAvailable
                      ? "Chart placeholder - User registration trends"
                      : "Analytics unavailable - Database connection required"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm sm:text-base">
                    {isFirebaseAvailable
                      ? "Chart placeholder - Revenue and withdrawal trends"
                      : "Analytics unavailable - Database connection required"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Firebase Diagnostics Tab */}
          <TabsContent value="diagnostics" className="space-y-4">
            <FirebaseDiagnostics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
