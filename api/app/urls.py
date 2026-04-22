from rest_framework.routers import DefaultRouter

from .views import (
    ActionViewSet,
    AgentViewSet,
    CustomerViewSet,
    EmployeeViewSet,
    ItemViewSet,
    OrderViewSet,
    ProductViewSet,
    SessionViewSet,
)

router = DefaultRouter()
router.register(r"items", ItemViewSet, basename="item")
router.register(r"employees", EmployeeViewSet, basename="employee")
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"agents", AgentViewSet, basename="agent")
router.register(r"sessions", SessionViewSet, basename="session")
router.register(r"actions", ActionViewSet, basename="action")

urlpatterns = router.urls
